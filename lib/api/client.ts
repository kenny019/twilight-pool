import wfetch from "../http";

const CLIENT_URL = process.env.NEXT_PUBLIC_CLIENT_ENDPOINT as string;

async function sendTradeOrder(tradeData: string) {
  const body = JSON.stringify({
    jsonrpc: "2.0",
    method: "CreateTraderOrder",
    params: {
      data: tradeData,
    },
    id: 1,
  });

  const { success, data, error } = await wfetch(CLIENT_URL)
    .post({ body })
    .json<Record<string, any>>();

  if (!success) {
    console.error(error);

    return {};
  }

  console.log("success sent trader order", data);
  return data;
}

async function sendLendOrder(lendData: string) {
  const body = JSON.stringify({
    jsonrpc: "2.0",
    method: "CreateLendOrder",
    params: {
      data: lendData,
    },
    id: 1,
  });

  const { success, data, error } = await wfetch(CLIENT_URL)
    .post({ body })
    .json<Record<string, any>>();

  if (!success) {
    console.error(error);

    return {};
  }

  console.log("success sent trader order", data);
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

  const { success, data, error } = await wfetch(CLIENT_URL)
    .post({ body })
    .json<Record<string, any>>();

  if (!success) {
    console.error(error);
    return {};
  }

  return data;
}

async function executeTradeOrder(msg: string) {
  const body = JSON.stringify({
    jsonrpc: "2.0",
    method: "ExecuteTraderOrder",
    params: {
      data: msg,
    },
    id: 1,
  });

  const { success, data, error } = await wfetch(CLIENT_URL)
    .post({ body })
    .json<Record<string, any>>();

  if (!success) {
    console.error(error);

    return {};
  }

  console.log("success sent execute trade order", data);
  return data;
}

export { sendTradeOrder, cancelTradeOrder, sendLendOrder, executeTradeOrder };
