import Big from "big.js";
import {
  broadcastTradingTx,
  getUtxosFromDB,
  queryUtxoForAddress,
  queryUtxoForOutput,
} from "../api/zkos";
import { retry } from "../helpers";
import { getZkAccountBalance } from "../twilight/zk";

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
    const outputResult = await retry<
      ReturnType<typeof queryUtxoForOutput>,
      string
    >(queryUtxoForOutput, 30, utxoHex, 100, (outputObj) =>
      Object.hasOwn(outputObj, "out_type")
    );

    if (!outputResult.success) {
      return {
        success: false,
        message: `Error with querying zkos endpoint`,
      };
    }

    const output = outputResult.data;

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
    >(queryUtxoForAddress, 30, address, 100, (utxoObj) =>
      Object.hasOwn(utxoObj, "output_index")
    );

    if (!utxoDataResult.success) {
      return {
        success: false,
        message: `Error with querying zkos endpoint`,
      };
    }

    return {
      success: true,
      data: utxoDataResult.data as UtxoData,
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
    console.log("getCoinOutputFromAddress", address);
    const coinOutputResult = await getCoinOutputFromAddress(address);

    if (!coinOutputResult.success) {
      return {
        success: false,
        message: coinOutputResult.message,
      };
    }

    const coinOutput = coinOutputResult.data;

    const outputString = JSON.stringify(coinOutput);

    console.log("getZKAccountHexFromOutputString", outputString);
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
      console.log("getZkAccountHexFromAddress", existingAccount.address);
      const zkAccountHexResult = await getZkAccountHexFromAddress(
        existingAccount.address
      );

      // note: most likely this account is not on chain
      // we should do coin monitoring and update.
      if (!zkAccountHexResult.success) {
        throw new Error(zkAccountHexResult.message);
      }

      const zkAccountHex = zkAccountHexResult.data;

      let amount = balance || existingAccount.value;

      if (amount === undefined) {
        console.log("decryptZKAccountHexValue", zkAccountHex);
        const accountValue = await decryptZKAccountHexValue({
          signature,
          zkAccountHex,
        });

        amount = Number(accountValue);
      }

      return new ZkPrivateAccount(
        existingAccount.address,
        existingAccount.scalar,
        Number(amount),
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

    // The ZKOS server sometimes returns a raw non-JSON error string such as
    // "{ Error: ... }" which JSON.parse cannot handle.  Parse defensively.
    let tradingTxRes: Record<string, unknown>;
    try {
      tradingTxRes = JSON.parse(tradingTxResString);
    } catch {
      return {
        success: false,
        message: `txCommit error: ${tradingTxResString}`,
      };
    }

    // The server uses both "error" and "Error" as keys depending on context.
    if (
      Object.hasOwn(tradingTxRes, "error") ||
      Object.hasOwn(tradingTxRes, "Error")
    ) {
      const detail = tradingTxRes.error ?? tradingTxRes.Error;
      return {
        success: false,
        message: `txCommit error: ${String(detail)}`,
      };
    }

    if (typeof tradingTxRes.txHash !== "string") {
      return {
        success: false,
        message: `txCommit returned unexpected format: ${tradingTxResString}`,
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
      const balanceResult = await getZkAccountBalance({
        zkAccountAddress: this.address,
        signature: this.signature,
      });

      if (balanceResult.value === undefined) {
        return {
          success: false,
          message: "Error getting balance",
        };
      }

      return {
        success: true,
        data: balanceResult.value,
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
    receiverAddress: string,
    receiverBalance?: number
  ): Promise<
    | SuccessResult<{
        scalar: string;
        txId: string;
        updatedAddress: string;
      }>
    | FailureResult
  > {
    const updatedBalance = this.value - amount;

    if (updatedBalance < 0) {
      return {
        success: false,
        message: "Unable to complete transfer, due to lack of funds",
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

    console.log("createInputCoinFromOutput");
    const inputString = await createInputCoinFromOutput({
      outputString,
      utxoString,
    });

    try {
      console.log("createTradingTxSingle");

      let isReceiverInput = false;
      let receiverInputOrAddress = receiverAddress;

      if (receiverBalance && receiverBalance > 0) {
        isReceiverInput = true;

        const receiverUtxoResult = await getUtxoFromAddress(receiverAddress);
        const receiverCoinOutputResult =
          await getCoinOutputFromAddress(receiverAddress);

        if (!receiverUtxoResult.success) {
          return {
            success: false,
            message: receiverUtxoResult.message,
          };
        }

        if (!receiverCoinOutputResult.success) {
          return {
            success: false,
            message: receiverCoinOutputResult.message,
          };
        }

        const receiverUtxoData = receiverUtxoResult.data;
        const receiverUtxoString = JSON.stringify(receiverUtxoData);

        const receiverCoinOutput = receiverCoinOutputResult.data;
        const receiverOutputString = JSON.stringify(receiverCoinOutput);

        const receiverInputString = await createInputCoinFromOutput({
          outputString: receiverOutputString,
          utxoString: receiverUtxoString,
        });

        receiverInputOrAddress = receiverInputString;
      }

      const tradingMsgStruct = await createTradingTxSingle({
        isReceiverInput,
        senderInput: inputString,
        amount: amount,
        receiverAddress: receiverInputOrAddress,
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

      console.log("getUpdatedAddressFromTransaction");

      const updatedAddressStringified = await getUpdatedAddressFromTransaction({
        signature: this.signature,
        txHex,
      });

      const updatedAddress = JSON.parse(updatedAddressStringified) as string[];
      this.address = updatedAddress[0];
      this.value = updatedBalance;
      this.updateStatus(updatedBalance > 0 ? true : false);

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
