import { ChainWalletBase } from "@cosmos-kit/core";
import { generatePublicKey, generatePublicKeyHexAddress } from "./zkos";
import wfetch from "../http";

async function generateSignMessage(
  chainWallet: ChainWalletBase,
  twAddress: string,
  message: string
) {
  const client = chainWallet.client;
  if (!client || !client.signArbitrary) return [];

  const { pub_key, signature } = await client.signArbitrary(
    "nyks",
    twAddress,
    message
  );

  return [pub_key, signature];
}

function getQuisTradingAddress(twilightAddress: string) {
  try {
    const data = window.localStorage.getItem(
      `twilight-${twilightAddress}-trading-address`
    );

    if (!data) return "";

    console.log("grabbing quis trading address", data);

    return data;
  } catch (err) {
    console.error(
      `Error reading localStorage, key twilight-${twilightAddress}-trading-address`,
      err
    );
    return "";
  }
}

async function createSubaccount(signature: string) {
  const quisPublicKey = await generatePublicKey({
    signature: signature as string,
  });

  const quisAddress = await generatePublicKeyHexAddress({
    publicKey: quisPublicKey,
  });

  return quisAddress;
}

async function getUtxosFromDB() {
  const body = {
    jsonrpc: "2.0",
    method: "getUtxosFromDB",
    params: {
      start_block: 0,
      end_block: -1,
      limit: 1000,
      pagination: 0,
      io_type: "Coin",
    },
    id: 1,
  };

  const apiURL = process.env.NEXT_PUBLIC_ZKOS_API_ENDPOINT as string;
  const { data, error, success } = await wfetch(`${apiURL}`)
    .post({
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify(body),
    })
    .json();

  if (!success) {
    console.error(error);
    return [];
  }

  return data;
}

export {
  generateSignMessage,
  getQuisTradingAddress,
  createSubaccount,
  getUtxosFromDB,
};
