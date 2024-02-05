import { ZkAccount } from "../types";
import {
  decryptZKAccountHexValue,
  generatePublicKey,
  generateTradingAccountAddress,
  getZKAccountHexFromOutputString,
  utxoStringToHex,
  generateRandomScalar,
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
  const utxoData = await queryUtxoForAddress(zkAccountAddress);

  console.log("utxoData", utxoData);

  if (!Object.hasOwn(utxoData, "output_index")) {
    return {
      isOnChain: false,
      value: 0,
    };
  }

  const utxoString = JSON.stringify(utxoData);

  const utxoHex = await utxoStringToHex({
    utxoString,
  });

  const output = await queryUtxoForOutput(utxoHex);

  if (!Object.hasOwn(output, "out_type")) {
    return {
      isOnChain: false,
      value: 0,
    };
  }

  console.log("output", output);

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

export { createZkAccount, getZkAccountBalance };
