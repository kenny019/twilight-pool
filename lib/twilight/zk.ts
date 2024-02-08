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
} from "./zkos";
import { queryUtxoForAddress, queryUtxoForOutput } from "../api/zkos";

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
  value: number;
  isOnChain: boolean;
}> {
  const output = getOutputFromZkAddress({ zkAccountAddress });

  if (!Object.hasOwn(output, "out_type")) {
    return {
      isOnChain: false,
      value: 0,
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

  console.log("decryptedValue", Number(accountValue));
  return {
    value: Number(accountValue),
    isOnChain: true,
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
    scriptAddress: "18f2ebda173ffc6ad2e3b4d3a3864a96ae8a6f7e30",
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

export { createZkAccount, getZkAccountBalance, createZkOrder };
