import {
  broadcastTradingTx,
  getUtxosFromDB,
  queryUtxoForAddress,
  queryUtxoForOutput,
} from "../api/zkos";
import { retry } from "../helpers";

import {
  createBurnMessageTx,
  createInputCoinFromOutput,
  createShuffleTransactionSingle,
  createTradingTxSingle,
  decryptZKAccountHexValue,
  generatePublicKey,
  generateRandomScalar,
  generateTradingAccount,
  getTradingAddressFromTradingAccount,
  getUpdatedAddressFromTransaction,
  getZKAccountHexFromOutputString,
  utxoStringToHex,
} from "../twilight/zkos";

import {
  FailureResult,
  OutputData,
  SuccessResult,
  UtxoData,
  ZkAccount,
} from "../types";

async function getCoinOutputFromUtxo(
  utxoHex: string
): Promise<SuccessResult<OutputData<"Coin">> | FailureResult> {
  try {
    const output = await queryUtxoForOutput(utxoHex);

    if (!Object.hasOwn(output, "out_type")) {
      return {
        success: false,
        message: `Output not found for ${utxoHex}`,
      };
    }

    return {
      success: true,
      data: output as OutputData<"Coin">,
    };
  } catch (err) {
    return {
      success: false,
      message: `Error retrieving Output for ${utxoHex} ${err}`,
    };
  }
}

async function getUtxoFromAddress(
  address: string
): Promise<SuccessResult<UtxoData> | FailureResult> {
  try {
    const utxoDataResult = await retry<
      ReturnType<typeof queryUtxoForAddress>,
      string
    >(queryUtxoForAddress, 4, address, 1000, (utxoObj) =>
      Object.hasOwn(utxoObj, "output_index")
    );

    if (!utxoDataResult.success) {
      return {
        success: false,
        message: `Error with querying zkos endpoint`,
      };
    }
    const utxoData = await queryUtxoForAddress(address);

    if (!Object.hasOwn(utxoData, "output_index")) {
      return {
        success: false,
        message: `Utxo not found for ${address}`,
      };
    }

    return {
      success: true,
      data: utxoData as UtxoData,
    };
  } catch (err) {
    return {
      success: false,
      message: `Error retrieving Utxo for ${address} ${err}`,
    };
  }
}

async function getCoinOutputFromAddress(
  address: string
): Promise<SuccessResult<OutputData<"Coin">> | FailureResult> {
  const utxoResult = await getUtxoFromAddress(address);

  if (!utxoResult.success) {
    return {
      success: false,
      message: utxoResult.message,
    };
  }

  const utxoData = utxoResult.data;

  const utxoString = JSON.stringify(utxoData);

  const utxoHex = await utxoStringToHex({
    utxoString,
  });

  const coinOutputResult = await getCoinOutputFromUtxo(utxoHex);

  if (!coinOutputResult.success) {
    return {
      success: false,
      message: coinOutputResult.message,
    };
  }

  return {
    success: true,
    data: coinOutputResult.data,
  };
}

async function getZkAccountHexFromAddress(
  address: string
): Promise<SuccessResult<string> | FailureResult> {
  try {
    const coinOutputResult = await getCoinOutputFromAddress(address);

    if (!coinOutputResult.success) {
      return {
        success: false,
        message: coinOutputResult.message,
      };
    }

    const coinOutput = coinOutputResult.data;

    const outputString = JSON.stringify(coinOutput);

    const zkAccountHex = await getZKAccountHexFromOutputString({
      outputString: outputString,
    });

    return {
      success: true,
      data: zkAccountHex,
    };
  } catch (err) {
    return {
      success: false,
      message: `Unknown error in getZkAccountHexFromAddress ${err}`,
    };
  }
}

export class ZkPrivateAccount {
  private readonly signature: string;
  private readonly scalar: string;
  private accountHex: string;
  private address: string;
  private value: number;
  private lastUpdatedTime: number;
  public isOnChain: boolean;

  private constructor(
    address: string,
    scalar: string,
    value: number,
    accountHex: string,
    signature: string,
    isOnChain?: boolean
  ) {
    this.signature = signature;
    this.address = address;
    this.scalar = scalar;
    this.accountHex = accountHex;
    this.value = value;
    this.lastUpdatedTime = Date.now();
    this.isOnChain = isOnChain || false;
  }

  static async create({
    signature,
    balance,
    existingAccount,
  }: {
    signature: string;
    balance?: number;
    existingAccount?: ZkAccount;
  }) {
    if (existingAccount) {
      const zkAccountHexResult = await getZkAccountHexFromAddress(
        existingAccount.address
      );

      // note: most likely this account is not on chain
      // we should do coin monitoring and update.
      if (!zkAccountHexResult.success) {
        throw new Error(zkAccountHexResult.message);
      }

      const zkAccountHex = zkAccountHexResult.data;

      const accountValue = await decryptZKAccountHexValue({
        signature,
        zkAccountHex,
      });

      return new ZkPrivateAccount(
        existingAccount.address,
        existingAccount.scalar,
        Number(accountValue),
        zkAccountHex,
        signature,
        true
      );
    }

    const publicKeyHex = await generatePublicKey({
      signature,
    });

    const scalar = await generateRandomScalar();

    const value = balance || 0;

    const zkAccountHex = await generateTradingAccount({
      publicKeyHex,
      balance: value,
      scalar,
    });

    const address = await getTradingAddressFromTradingAccount({
      tradingAccountAddress: zkAccountHex,
    });

    return new ZkPrivateAccount(
      address,
      scalar,
      value,
      zkAccountHex,
      signature
    );
  }

  private updateStatus(isOnChain: boolean) {
    this.isOnChain = isOnChain;

    this.lastUpdatedTime = Date.now();
  }

  private async txCommit(
    txHex: string,
    ...extra: string[]
  ): Promise<SuccessResult<string> | FailureResult> {
    const tradingTxResString = await broadcastTradingTx(txHex, ...extra);

    if (typeof tradingTxResString !== "string") {
      console.error(tradingTxResString);
      return {
        success: false,
        message: `Error broadcasting txCommit`,
      };
    }

    const tradingTxRes = JSON.parse(tradingTxResString);

    if (Object.hasOwn(tradingTxRes, "error")) {
      return {
        success: false,
        message: "Error",
      };
    }

    return {
      success: true,
      data: tradingTxRes.txHash,
    };
  }

  public get() {
    return {
      address: this.address,
      scalar: this.scalar,
      value: this.value,
      accountHex: this.accountHex,
      isOnChain: this.isOnChain,
    };
  }

  public async getAccountBalance(): Promise<
    SuccessResult<number> | FailureResult
  > {
    try {
      const coinOutputResult = await getCoinOutputFromAddress(this.address);

      if (!coinOutputResult.success) {
        return {
          success: false,
          message: coinOutputResult.message,
        };
      }

      const outputString = JSON.stringify(coinOutputResult.data);

      const zkAccountHex = await getZKAccountHexFromOutputString({
        outputString,
      });

      const accountValue = await decryptZKAccountHexValue({
        signature: this.signature,
        zkAccountHex,
      });

      this.updateStatus(true);

      this.value = Number(accountValue);
      return {
        success: true,
        data: this.value,
      };
    } catch (err) {
      this.updateStatus(false);
      return {
        success: false,
        message: `Error getting balance ${err}`,
      };
    }
  }

  public async burn(twilightAddress: string): Promise<
    | SuccessResult<{
        accountHex: string;
        scalar: string;
        value: number;
        txHash: string;
      }>
    | FailureResult
  > {
    if (!this.isOnChain) {
      return {
        success: false,
        message: "Account is not on chain",
      };
    }

    try {
      const utxoResult = await getUtxoFromAddress(this.address);

      if (!utxoResult.success) {
        {
          return {
            success: false,
            message: utxoResult.message,
          };
        }
      }

      const utxoData = utxoResult.data;
      const utxoString = JSON.stringify(utxoData);

      const coinOutputResult = await getCoinOutputFromAddress(this.address);

      if (!coinOutputResult.success) {
        return {
          success: false,
          message: coinOutputResult.message,
        };
      }

      const outputData = coinOutputResult.data;
      const outputString = JSON.stringify(outputData);

      const inputString = await createInputCoinFromOutput({
        outputString,
        utxoString,
      });

      const burnMsg = await createBurnMessageTx({
        inputString,
        address: this.address,
        amount: this.value,
        scalar: this.scalar,
        signature: this.signature,
      });

      const txCommitResult = await this.txCommit(burnMsg, twilightAddress);

      if (!txCommitResult.success) {
        return {
          success: false,
          message: txCommitResult.message,
        };
      }

      this.updateStatus(false);
      this.value = 0;

      return {
        success: true,
        data: {
          accountHex: this.accountHex,
          scalar: this.scalar,
          txHash: txCommitResult.data,
          value: this.value,
        },
      };
    } catch (err) {
      this.updateStatus(false);
      return {
        success: false,
        message: `Error creating burn transaction ${err}`,
      };
    }
  }

  public async privateTxSingle(
    amount: number,
    receiverAddress: string
  ): Promise<
    | SuccessResult<{
        scalar: string;
        txId: string;
        updatedAddress: string;
      }>
    | FailureResult
  > {
    const updatedBalance = this.value - amount;

    if (amount < 0) {
      return {
        success: false,
        message: `Unable to transfer ${amount} sats, due to lack of funds ${this.value}`,
      };
    }

    const utxoResult = await getUtxoFromAddress(this.address);

    if (!utxoResult.success) {
      this.updateStatus(false);
      return {
        success: false,
        message: utxoResult.message,
      };
    }

    const coinOutputResult = await getCoinOutputFromAddress(this.address);

    if (!coinOutputResult.success) {
      return {
        success: false,
        message: coinOutputResult.message,
      };
    }

    const utxoData = utxoResult.data;
    const utxoString = JSON.stringify(utxoData);

    const coinOutput = coinOutputResult.data;
    const outputString = JSON.stringify(coinOutput);

    const inputString = await createInputCoinFromOutput({
      outputString,
      utxoString,
    });

    try {
      const tradingMsgStruct = await createTradingTxSingle({
        senderInput: inputString,
        amount,
        receiverAddress: receiverAddress,
        signature: this.signature,
        updatedSenderBalance: updatedBalance,
      });

      const { encrypt_scalar_hex, tx: txHex } = JSON.parse(
        tradingMsgStruct
      ) as {
        tx: string;
        encrypt_scalar_hex: string;
      };

      const txCommitResult = await this.txCommit(txHex);

      if (!txCommitResult.success) {
        return {
          success: false,
          message: txCommitResult.message,
        };
      }

      const txId = txCommitResult.data;

      const updatedAddressStringified = await getUpdatedAddressFromTransaction({
        signature: this.signature,
        txHex,
      });

      const updatedAddress = JSON.parse(updatedAddressStringified) as string[];

      this.address = updatedAddress[0];
      this.value = updatedBalance;
      this.updateStatus(true);

      return {
        success: true,
        data: {
          scalar: encrypt_scalar_hex,
          txId: txId,
          updatedAddress: updatedAddress[1],
        },
      };
    } catch (err) {
      console.error(err);
      return {
        success: false,
        message: `${err}`,
      };
    }
  }

  public async shuffleTxSingle(
    amount: number,
    receiverAddress: string,
    startBlock: number,
    endBlock: number
  ): Promise<SuccessResult<string> | FailureResult> {
    const updatedBalance = this.value - amount;

    if (amount < 0) {
      return {
        success: false,
        message: `Unable to transfer ${amount} sats, due to lack of funds ${this.value}`,
      };
    }

    const utxoResult = await getUtxoFromAddress(this.address);

    if (!utxoResult.success) {
      this.updateStatus(false);
      return {
        success: false,
        message: utxoResult.message,
      };
    }

    const coinOutputResult = await getCoinOutputFromAddress(this.address);

    if (!coinOutputResult.success) {
      return {
        success: false,
        message: coinOutputResult.message,
      };
    }

    const utxoData = utxoResult.data;
    const utxoString = JSON.stringify(utxoData);

    const coinOutput = coinOutputResult.data;
    const outputString = JSON.stringify(coinOutput);

    const inputString = await createInputCoinFromOutput({
      outputString,
      utxoString,
    });

    try {
      const utxoOutputs = await getUtxosFromDB(startBlock, endBlock, 0);

      if (!utxoOutputs) {
        return {
          success: false,
          message: "Unable to get utxos from db",
        };
      }

      const shuffleTxMsg = await createShuffleTransactionSingle({
        senderInput: inputString,
        receiverAddress: receiverAddress,
        updatedSenderBalance: updatedBalance,
        amount,
        signature: this.signature,
        anonymitySet: utxoOutputs,
      });

      const txCommitResult = await this.txCommit(shuffleTxMsg);

      if (!txCommitResult.success) {
        return {
          success: false,
          message: txCommitResult.message,
        };
      }

      return {
        success: true,
        data: txCommitResult.data,
      };
    } catch (err) {
      console.error(err);

      return {
        success: false,
        message: `${err}`,
      };
    }
  }
}
