import wfetch from "../http";

const RELAYER_URL = process.env.NEXT_PUBLIC_RELAYER_ENDPOINT as string;

async function sendTradeOrder(tradeData: string) {
  const body = JSON.stringify({
    jsonrpc: "2.0",
    method: "CreateTraderOrder",
    params: {
      data: tradeData,
    },
    id: 1,
  });

  const { success, data, error } = await wfetch(RELAYER_URL)
    .post({ body })
    .json<Record<string, any>>();

  if (!success) {
    console.error(error);

    return {};
  }

  console.log("success sent trader order", data);
  return data;
}

export { sendTradeOrder };
