import wfetch from "../http";
import { OutputData, TwilightApiResponse, UtxoData } from "../types";

const ZK_URL = process.env.NEXT_PUBLIC_ZKOS_API_ENDPOINT as string;

async function queryUtxoForAddress(
  zkAddress: string
): Promise<Record<string, never> | UtxoData> {
  const body = JSON.stringify({
    jsonrpc: "2.0",
    method: "getUtxos",
    params: [zkAddress],
    id: 1,
  });

  console.log(ZK_URL, {
    jsonrpc: "2.0",
    method: "getUtxos",
    params: [zkAddress],
    id: 1,
  });

  const { success, data, error } = await wfetch(ZK_URL)
    .post({ body })
    .json<TwilightApiResponse<UtxoData[]>>();

  if (!success) {
    console.error(error);
    return {};
  }

  const result = data.result;

  if (typeof result === "string") {
    return {};
  }

  return result[0];
}

async function queryUtxoForOutput(
  utxoHex: string
): Promise<Record<string, never> | OutputData<"Coin">> {
  const body = JSON.stringify({
    jsonrpc: "2.0",
    method: "getOutput",
    params: [utxoHex],
    id: 1,
  });

  const { success, data, error } = await wfetch(ZK_URL)
    .post({ body })
    .json<TwilightApiResponse<OutputData<"Coin">>>(); // note: "Coin" constant could possibly be abstracted

  if (!success) {
    console.error(error);
    return {};
  }

  const result = data.result;

  if (typeof result === "string") return {};

  return result;
}

async function broadcastTradingTx(
  txHex: string,
  ...extra: string[]
): Promise<Record<string, never> | string> {
  const body = JSON.stringify({
    jsonrpc: "2.0",
    method: "txCommit",
    params: [txHex, ...extra],
    id: 1,
  });

  console.log("txCommit", body);

  const { success, data, error } = await wfetch(ZK_URL)
    .post({ body })
    .json<TwilightApiResponse<string>>(); // note: "Coin" constant could possibly be abstracted

  if (!success) {
    console.error(error);
    return {};
  }

  const result = data.result;

  if (typeof result !== "string") return {};

  return result;
}

async function getUtxosFromDB(
  startBlock: number,
  endBlock: number,
  currentPage: number
) {
  const body = {
    jsonrpc: "2.0",
    method: "getUtxosFromDB",
    params: {
      start_block: startBlock,
      end_block: endBlock,
      limit: 100,
      pagination: currentPage,
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
    .json<TwilightApiResponse<{ result: string | null }>>();

  if (!success) {
    console.error(error);
    return null;
  }

  return data.result.result;
}

export {
  queryUtxoForAddress,
  queryUtxoForOutput,
  broadcastTradingTx,
  getUtxosFromDB,
};
