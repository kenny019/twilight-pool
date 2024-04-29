import relayerProgram from "./relayerprogram.json";
import { OrderTypes, PositionTypes, ZkAccount } from "../types";
import {
  decryptZKAccountHexValue,
  generatePublicKey,
  generateTradingAccountAddress,
  getZKAccountHexFromOutputString,
  utxoStringToHex,
  generateRandomScalar,
  createInputCoinFromOutput,
  createTraderOrder,
  generateTradingAccount,
  getTradingAddressFromTradingAccount,
  createZkOSLendOrder,
  coinAddressMonitoring,
  createBurnMessageTx,
} from "./zkos";
import {
  getUtxosFromDB,
  queryUtxoForAddress,
  queryUtxoForOutput,
} from "../api/zkos";
import { retry } from "../helpers";

async function createZkAccount({
  tag,
  signature,
}: {
  tag: string;
  signature: string;
}): Promise<ZkAccount> {
  const publicKeyHex = await generatePublicKey({
    signature,
  });

  const zkAccountAddress = await generateTradingAccountAddress({
    publicKeyHex,
  });

  const scalar = await generateRandomScalar();

  return {
    address: zkAccountAddress,
    scalar,
    tag,
  };
}

async function createZkAccountWithBalance({
  tag,
  signature,
  balance,
}: {
  tag: string;
  signature: string;
  balance: number;
}): Promise<{
  account: ZkAccount;
  accountHex: string;
}> {
  const publicKeyHex = await generatePublicKey({
    signature,
  });

  const scalar = await generateRandomScalar();

  const newTradingAccountHex = await generateTradingAccount({
    publicKeyHex,
    balance,
    scalar,
  });

  const address = await getTradingAddressFromTradingAccount({
    tradingAccountAddress: newTradingAccountHex,
  });

  return {
    account: {
      address,
      scalar,
      tag,
      isOnChain: false,
      value: balance,
    },
    accountHex: newTradingAccountHex,
  };
}

async function getOutputFromZkAddress({
  zkAccountAddress,
}: {
  zkAccountAddress: string;
}) {
  const utxoData = await queryUtxoForAddress(zkAccountAddress);

  if (!Object.hasOwn(utxoData, "output_index")) {
    return {};
  }

  const utxoString = JSON.stringify(utxoData);

  const utxoHex = await utxoStringToHex({
    utxoString,
  });

  const output = await queryUtxoForOutput(utxoHex);

  return output;
}

async function getZkAccountBalance({
  zkAccountAddress,
  signature,
}: {
  zkAccountAddress: string;
  signature: string;
}): Promise<{
  address: string;
  value?: number;
}> {
  try {
    const output = await getOutputFromZkAddress({ zkAccountAddress });

    if (!Object.hasOwn(output, "out_type")) {
      return {
        address: zkAccountAddress,
      };
    }

    const outputString = JSON.stringify(output);

    const zkAccountHex = await getZKAccountHexFromOutputString({
      outputString,
    });

    const accountValue = await decryptZKAccountHexValue({
      signature,
      zkAccountHex,
    });

    return {
      address: zkAccountAddress,
      value: Number(accountValue),
    };
  } catch (err) {
    console.error(err);
    return {
      address: zkAccountAddress,
      value: 0,
    };
  }
}

async function createZkBurnTx({
  zkAccount,
  signature,
  initZkAccountAddress,
}: {
  zkAccount: ZkAccount;
  signature: string;
  initZkAccountAddress: string;
}) {
  if (!zkAccount.value) {
    return {
      success: false,
    };
  }

  const zkAccountAddress = zkAccount.address;

  const utxoDataResult = await retry<
    ReturnType<typeof queryUtxoForAddress>,
    string
  >(queryUtxoForAddress, 9, zkAccountAddress, 2500, (utxoObj) =>
    Object.hasOwn(utxoObj, "output_index")
  );

  if (!utxoDataResult.success) {
    console.error("no utxoData");

    return {
      success: false,
      message: `Error with querying zkos endpoint`,
    };
  }

  const utxoString = JSON.stringify(utxoDataResult.data);

  const utxoHex = await utxoStringToHex({
    utxoString,
  });

  const output = await queryUtxoForOutput(utxoHex);

  if (!Object.hasOwn(output, "out_type")) {
    console.error("no output");
    return {
      success: false,
    };
  }

  const outputString = JSON.stringify(output);

  const inputString = await createInputCoinFromOutput({
    outputString,
    utxoString,
  });

  const burnMsgPromise = createBurnMessageTx({
    inputString,
    address: initZkAccountAddress,
    amount: zkAccount.value,
    scalar: zkAccount.scalar,
    signature,
  });

  const zkAccountHexPromise = getZKAccountHexFromOutputString({
    outputString: outputString,
  });

  const [burnMsg, zkAccountHex] = await Promise.all([
    burnMsgPromise,
    zkAccountHexPromise,
  ]);

  console.log({
    inputString,
    address: zkAccount.address,
    amount: zkAccount.value,
    scalar: zkAccount.scalar,
    signature,
  });

  return {
    success: true,
    msg: burnMsg,
    zkAccountHex,
  };
}

async function createZkOrder({
  zkAccount,
  signature,
  value,
  positionType,
  orderType,
  leverage,
  entryPrice,
  timebounds,
}: {
  zkAccount: ZkAccount;
  signature: string;
  value: number;
  positionType: PositionTypes;
  orderType: OrderTypes;
  leverage: number;
  entryPrice?: number;
  timebounds: number;
}) {
  const zkAccountAddress = zkAccount.address;
  const scalar = zkAccount.scalar;

  const utxoData = await queryUtxoForAddress(zkAccountAddress);

  if (!Object.hasOwn(utxoData, "output_index")) {
    console.error("no utxoData");
    return {
      success: false,
    };
  }

  const utxoString = JSON.stringify(utxoData);

  const utxoHex = await utxoStringToHex({
    utxoString,
  });

  const output = await queryUtxoForOutput(utxoHex);

  if (!Object.hasOwn(output, "out_type")) {
    console.error("no output");
    return {
      success: false,
    };
  }

  const outputString = JSON.stringify(output);

  const inputString = await createInputCoinFromOutput({
    outputString,
    utxoString,
  });

  const orderString = await createTraderOrder({
    inputString,
    programContract: JSON.stringify(relayerProgram),
    signature,
    scalar,
    value,
    positionType,
    orderType,
    leverage,
    entryPrice,
    timebounds,
  });

  return {
    success: true,
    msg: orderString,
  };
}

async function createZkLendOrder({
  zkAccount,
  signature,
  deposit,
}: {
  zkAccount: ZkAccount;
  signature: string;
  deposit: number;
}) {
  // todo: refactor
  const zkAccountAddress = zkAccount.address;
  const scalar = zkAccount.scalar;

  const utxoData = await queryUtxoForAddress(zkAccountAddress);

  if (!Object.hasOwn(utxoData, "output_index")) {
    console.error("no utxoData");
    return {
      success: false,
    };
  }

  const utxoString = JSON.stringify(utxoData);

  const utxoHex = await utxoStringToHex({
    utxoString,
  });

  const output = await queryUtxoForOutput(utxoHex);

  if (!Object.hasOwn(output, "out_type")) {
    console.error("no output");
    return {
      success: false,
    };
  }

  const outputString = JSON.stringify(output);

  const inputString = await createInputCoinFromOutput({
    outputString,
    utxoString,
  });

  const orderString = await createZkOSLendOrder({
    inputString,
    scalar,
    scriptAddress: "1860eef63edee1078178b3adb63e9f86921caa16b5",
    signature,
    deposit,
  });
  return {
    success: true,
    msg: orderString,
  };
}

async function syncOnChainZkAccounts({
  startBlock,
  endBlock,
  currentZkAccounts,
  signature,
}: {
  startBlock: number;
  endBlock: number;
  currentZkAccounts?: ZkAccount[];
  signature: string;
}) {
  try {
    let finishSync = false;
    let currentPage = 0;

    while (!finishSync) {
      const result = await getUtxosFromDB(startBlock, endBlock, currentPage);

      if (result === null) {
        finishSync = true;
        break;
      }

      const utxoOutputString = result;
      currentPage += 1;

      const onChainTradingAccountString = await coinAddressMonitoring({
        utxoOutputString,
        signature,
      });

      if (!onChainTradingAccountString) {
        continue;
      }

      const onChainTradingAccounts = JSON.parse(
        onChainTradingAccountString
      ) as string[];

      const accountValuePromises = onChainTradingAccounts.map((address) =>
        getZkAccountBalance({
          signature,
          zkAccountAddress: address,
        })
      );

      const accountWithBalance = await Promise.all(accountValuePromises);
      console.log("accountWithBalance", accountWithBalance);
    }
  } catch (err) {
    console.error(err);
  }
}

export {
  createZkAccount,
  getZkAccountBalance,
  createZkOrder,
  createZkAccountWithBalance,
  createZkLendOrder,
  syncOnChainZkAccounts,
  createZkBurnTx,
};
