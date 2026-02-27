import dayjs from "dayjs";
import wfetch from "../http";
import {
  createCancelTraderOrderMsg,
  createCancelTraderOrderSltpMsg,
} from "../twilight/zkos";
import { FundingHistoryEntry, QueryLendOrderData } from "../types";

const RELAYER_PUBLIC_URL = process.env
  .NEXT_PUBLIC_TWILIGHT_PRICE_REST as string;

async function queryLendOrder(msg: string) {
  const body = JSON.stringify({
    jsonrpc: "2.0",
    method: "lend_order_info",
    params: {
      data: msg,
    },
    id: 1,
  });

  const { success, data, error } = await wfetch(RELAYER_PUBLIC_URL)
    .post({ body })
    .json<Record<string, any>>();

  if (!success) {
    console.error(error);
    return null;
  }

  return data as {
    jsonrpc: "2.0";
    result: QueryLendOrderData;
    id: number;
  };
}

async function cancelTradeOrder({
  address,
  uuid,
  signature,
}: {
  address: string;
  uuid: string;
  signature: string;
}) {
  const msg = await createCancelTraderOrderMsg({
    address,
    signature,
    uuid,
  });

  const body = JSON.stringify({
    jsonrpc: "2.0",
    method: "cancel_trader_order",
    params: {
      data: msg,
    },
    id: 1,
  });

  const { success, data, error } = await wfetch(RELAYER_PUBLIC_URL)
    .post({ body })
    .json<Record<string, any>>();

  if (!success) {
    console.error("cancel trade order error", error);
    return {};
  }

  return data;
}

async function cancelTradeOrderSlTp({
  address,
  uuid,
  signature,
  sl_bool,
  tp_bool,
}: {
  address: string;
  uuid: string;
  signature: string;
  sl_bool: boolean;
  tp_bool: boolean;
}) {
  const msg = await createCancelTraderOrderSltpMsg({
    address,
    signature,
    uuid,
    sl_bool,
    tp_bool,
  });

  const body = JSON.stringify({
    jsonrpc: "2.0",
    method: "CancelTraderOrderSlTp",
    params: {
      data: msg,
    },
    id: 1,
  });

  const { success, data, error } = await wfetch(RELAYER_PUBLIC_URL)
    .post({ body })
    .json<Record<string, any>>();

  if (!success) {
    console.error("cancel trade order SLTP error", error);
    return {};
  }

  return data;
}

export type QueryTradeOrderData = {
  account_id: string;
  available_margin: string;
  bankruptcy_price: string;
  bankruptcy_value: string;
  entry_nonce: number;
  entry_sequence: number;
  entryprice: string;
  execution_price: string;
  exit_nonce: number;
  id: number;
  initial_margin: string;
  leverage: string;
  liquidation_price: string;
  maintenance_margin: string;
  order_status: string;
  order_type: string;
  position_type: string;
  positionsize: string;
  settlement_price: string;
  timestamp: string;
  unrealized_pnl: string;
  uuid: string;
  fee_filled: string;
  fee_settled: string;
  settle_limit: null | {
    position_type: "LONG" | "SHORT";
    price: string;
    uuid: string;
    timestamp?: string;
  };
  take_profit: null | {
    tp_price: string;
    timestamp: string;
  };
  stop_loss: null | {
    sl_price: string;
    timestamp: string;
  };
  funding_applied: string;
};

async function queryTradeOrder(msg: string) {
  const body = JSON.stringify({
    jsonrpc: "2.0",
    method: "trader_order_info_v1",
    params: {
      data: msg,
    },
    id: 1,
  });

  const { success, data, error } = await wfetch(RELAYER_PUBLIC_URL, {
    headers: {
      "date-time": dayjs().unix().toString(),
      "Content-Type": "application/json",
    },
  })
    .post({ body })
    .json<Record<string, any>>();

  if (!success) {
    console.error(error);
    return null;
  }

  return data as {
    jsonrpc: "2.0";
    result: QueryTradeOrderData;
    id: number;
  };
}

async function queryOrderFundingHistory(msg: string) {
  const body = JSON.stringify({
    jsonrpc: "2.0",
    method: "order_funding_history",
    params: {
      data: msg,
    },
    id: 1,
  });

  const { success, data, error } = await wfetch(RELAYER_PUBLIC_URL, {
    headers: {
      "date-time": dayjs().unix().toString(),
      "Content-Type": "application/json",
    },
  })
    .post({ body })
    .json<Record<string, any>>();

  if (!success) {
    console.error("queryOrderFundingHistory error", error);
    return null;
  }

  const result = data?.result;
  if (!Array.isArray(result)) {
    return [];
  }

  return result as FundingHistoryEntry[];
}

export {
  queryLendOrder,
  queryTradeOrder,
  cancelTradeOrder,
  cancelTradeOrderSlTp,
  queryOrderFundingHistory,
};
