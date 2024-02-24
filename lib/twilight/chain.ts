import { ChainWalletBase } from "@cosmos-kit/core";
import wfetch from "../http";
import { ZkAccount } from "../types";

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

type UtxoFromDBResponse = {
  result: {
    result: string;
  };
};

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
  const { data, error, success } = await wfetch(apiURL)
    .post({
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    })
    .json<UtxoFromDBResponse>();

  if (!success) {
    console.error(error);
    return "";
  }

  return data;
}

export { generateSignMessage, getUtxosFromDB };
