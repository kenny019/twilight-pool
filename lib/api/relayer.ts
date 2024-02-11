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

async function queryTradeOrder(tradeData: string) {
  const body = JSON.stringify({
    jsonrpc: "2.0",
    method: "QueryTraderOrderZkos",
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

  return data;
}

async function cancelTradeOrder({
  accountId,
  uuid,
  orderType,
  orderStatus,
}: {
  accountId: string;
  uuid: string;
  orderType: string;
  orderStatus: string;
}) {
  const body = JSON.stringify({
    jsonrpc: "2.0",
    method: "CancelTraderOrder",
    params: {
      account_id: accountId,
      uuid,
      order_type: orderType,
      order_status: orderStatus,
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

  return data;
}

async function queryLendOrder(lendData: string) {
  const body = JSON.stringify({
    jsonrpc: "2.0",
    method: "QueryLendOrderZkos",
    params: {
      data: lendData,
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

  return data;
}

export { sendTradeOrder, queryLendOrder, queryTradeOrder, cancelTradeOrder };
