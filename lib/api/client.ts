import wfetch from "../http";
import { createCancelTraderOrderMsg } from "../twilight/zkos";

const CLIENT_URL = process.env.NEXT_PUBLIC_CLIENT_ENDPOINT as string;

async function sendTradeOrder(tradeData: string, twilightAddress?: string) {
  const body = JSON.stringify({
    jsonrpc: "2.0",
    method: "CreateTraderOrder",
    params: {
      data: tradeData,
    },
    id: 1,
  });

  const headers: Record<string, string> = {};
  if (twilightAddress) {
    headers["Twilight-Address"] = twilightAddress;
  }

  const { success, data, error } = await wfetch(CLIENT_URL)
    .post({ body, headers })
    .json<Record<string, any>>();

  if (!success) {
    console.error(error);

    return {};
  }

  console.log("success sent trader order", data);
  return data;
}

async function sendLendOrder(lendData: string, twilightAddress?: string) {
  const body = JSON.stringify({
    jsonrpc: "2.0",
    method: "CreateLendOrder",
    params: {
      data: lendData,
    },
    id: 1,
  });

  const headers: Record<string, string> = {};
  if (twilightAddress) {
    headers["Twilight-Address"] = twilightAddress;
  }

  const { success, data, error } = await wfetch(CLIENT_URL)
    .post({ body, headers })
    .json<Record<string, any>>();

  if (!success) {
    console.error(error);

    return {};
  }

  console.log("success sent lend order", data);
  return data;
}

async function executeLendOrder(msg: string) {
  const body = JSON.stringify({
    jsonrpc: "2.0",
    method: "ExecuteLendOrder",
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

  console.log("success sent execute lend  order", data);
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

export { sendTradeOrder, sendLendOrder, executeTradeOrder, executeLendOrder };
