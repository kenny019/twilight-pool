import wfetch from "../http";

const ZK_URL = process.env.NEXT_PUBLIC_ZKOS_API_ENDPOINT as string;

type ZkApiResponse<Result> = {
  id: number;
  jsonrpc: string;
  result: string | Result;
};

type UtxoData = {
  output_index: number;
  txid: number[];
};

async function queryUtxoForAddress(
  zkAddress: string
): Promise<Record<string, never> | UtxoData> {
  const body = JSON.stringify({
    jsonrpc: "2.0",
    method: "getUtxos",
    params: [zkAddress],
    id: 1,
  });

  const { success, data, error } = await wfetch(ZK_URL)
    .post({ body })
    .json<ZkApiResponse<UtxoData[]>>();

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

type OutputData<OutputType extends string> = {
  out_type: OutputType;
  output: OutputTypeValues<OutputType>;
};

type OutputTypeValues<OutputType extends string> = {
  [key in OutputType]: {
    encrypt: {
      c: number[];
      d: number[];
    };
    owner: string;
  };
};

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
    .json<ZkApiResponse<OutputData<"Coin">>>(); // note: "Coin" constant could possibly be abstracted

  if (!success) {
    console.error(error);
    return {};
  }

  const result = data.result;

  if (typeof result === "string") return {};

  return result;
}

export { queryUtxoForAddress, queryUtxoForOutput };