import wfetch from "../http";
import {
  CandleInterval,
  LendPoolInfo,
  OpenLimitOrderData,
  TwilightApiResponse,
  twilightRegistedBtcAddressStruct,
} from "../types";

const REST_URL = process.env.NEXT_PUBLIC_TWILIGHT_API_REST as string;

async function getBTCDepositAddress(depositAddress: string) {
  const { success, data, error } = await wfetch(
    new URL(
      REST_URL +
        `/twilight-project/nyks/bridge/registered_btc_deposit_address_by_twilight_address/${depositAddress}`
    )
  )
    .get()
    .json<twilightRegistedBtcAddressStruct>();

  if (!success) {
    console.error("getBTCDepositAddress", error);

    return {
      success,
      error,
    };
  }

  return {
    success,
    data,
  };
}

export type BtcReserveStruct = {
  ReserveId: string;
  ReserveAddress: string;
  JudgeAddress: string;
  BtcRelayCapacityValue: string;
  TotalValue: string;
  PrivatePoolValue: string;
  PublicValue: string;
  FeePool: string;
  UnlockHeight: string;
  RoundId: string;
};

type ReserveDataStruct = {
  BtcReserves: BtcReserveStruct[];
};

async function getReserveData() {
  const { success, data, error } = await wfetch(
    new URL(REST_URL + "/twilight-project/nyks/volt/btc_reserve")
  )
    .get()
    .json<ReserveDataStruct>();

  if (!success) {
    console.error("getReserveData", error);

    return {
      success,
      error,
    };
  }

  return {
    success,
    data,
  };
}

// todo: refactor into seperate files
export const priceURL = process.env.NEXT_PUBLIC_TWILIGHT_PRICE_REST as string;

type PriceFeedData = {
  id: string;
  price: string;
  timestamp: string;
};

const bearerToken = process.env.PRICE_ORACLE_TOKEN as string;

async function getBTCPrice() {
  const response = await wfetch(priceURL, {
    next: {
      revalidate: 10,
    },
  })
    .post({
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "btc_usd_price",
        id: 123, // todo: autoincrement
        params: null,
      }),
      headers: {
        Authorization: `Bearer ${bearerToken}`,
      },
    })
    .json<TwilightApiResponse<PriceFeedData>>();

  return response;
}

export type CandleData = {
  btc_volume: string;
  close: string;
  end: string;
  high: string;
  low: string;
  open: string;
  resolution: string;
  start: string;
  trades: number;
  usd_volume: string;
};

async function getCandleData({
  since,
  limit = 15,
  offset = 0,
  interval,
  revalidate,
}: {
  since: string;
  interval: keyof typeof CandleInterval;
  revalidate?: number;
  limit?: number;
  offset?: number;
}) {
  const response = await wfetch(priceURL, {
    next: {
      revalidate: revalidate ? revalidate : 0,
    },
  })
    .post({
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "candle_data",
        id: 123, // todo: autoincrement
        params: {
          interval,
          since,
          limit,
          offset,
        },
      }),
      headers: {
        Authorization: `Bearer ${bearerToken}`,
      },
    })
    .json<TwilightApiResponse<CandleData[]>>();

  return response;
}

async function getOpenLimitOrders() {
  const response = await wfetch(priceURL, {
    next: {
      revalidate: 0,
    },
  })
    .post({
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "open_limit_orders",
        id: 123,
      }),
    })
    .json<TwilightApiResponse<OpenLimitOrderData>>();

  return response;
}

export type RecentTrade = {
  timestamp: string;
  side: "LONG" | "SHORT";
  price: string;
  positionsize: string;
};

async function getRecentLimitOrders() {
  const response = await wfetch(priceURL, {
    next: {
      revalidate: 0,
    },
  })
    .post({
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "recent_trade_orders",
        id: 123,
      }),
    })
    .json<TwilightApiResponse<RecentTrade[]>>();

  return response;
}

type FundingData = {
  id: number;
  price: string;
  rate: string;
  timestamp: string;
};

async function getFundingRate() {
  const response = await wfetch(priceURL, {
    next: {
      revalidate: 0,
    },
  })
    .post({
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "get_funding_rate",
        id: 123,
        params: null,
      }),
    })
    .json<TwilightApiResponse<FundingData>>();

  return response;
}

export type TransactionHash = {
  account_id: string;
  datetime: string;
  id: number;
  order_id: string;
  order_status: string;
  order_type: string;
  output: string;
  request_id: string | null;
  tx_hash: string;
};

type TransactionHashOpts = {
  status?: "FILLED" | "SETTLED" | "PENDING" | "CANCELLED";
  limit?: number;
  offset?: number;
};

async function getLastDayApy() {
  const body = JSON.stringify({
    jsonrpc: "2.0",
    method: "last_day_apy",
    id: 123,
    params: null,
  });

  const { success, data, error } = await wfetch(priceURL)
    .post({ body })
    .json<TwilightApiResponse<string>>();

  if (!success) {
    console.error("getLastDayApy", error);
    return 0;
  }

  // API returns decimal (0.0821 = 8.21%), convert to percentage for display
  return (parseFloat(data.result) || 0) * 100;
}

async function getPoolShareValue() {
  const body = JSON.stringify({
    jsonrpc: "2.0",
    method: "pool_share_value",
    id: 1,
    params: null,
  });

  const { success, data, error } = await wfetch(priceURL)
    .post({ body })
    .json<TwilightApiResponse<number>>();

  if (!success) {
    console.error(error);
    return 0;
  }

  const { result } = data;

  return result;
}

async function getLendPoolInfo() {
  const body = JSON.stringify({
    jsonrpc: "2.0",
    method: "lend_pool_info",
    id: 1,
    params: null,
  });

  const { success, data, error } = await wfetch(priceURL)
    .post({ body })
    .json<TwilightApiResponse<LendPoolInfo>>();

  if (!success) {
    console.error(error);
    return null;
  }

  const { result } = data;

  return result;
}

export type MarketStatsData = {
  long_pct: number;
  short_pct: number;
  open_interest_btc: number;
  total_long_btc: number;
  total_short_btc: number;
  net_exposure_btc: number;
  pool_equity_btc: number;
  max_long_btc: number;
  max_short_btc: number;
  utilization: number;
  status: string;
  status_reason: string | null;
  params: {
    max_leverage: number;
    max_net_mult: number;
    max_oi_mult: number;
    max_position_pct: number;
    min_position_btc: number;
  };
};

async function getMarketStats() {
  const response = await wfetch(priceURL, {
    next: {
      revalidate: 0,
    },
  })
    .post({
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "get_market_stats",
        id: 123,
        params: null,
      }),
    })
    .json<TwilightApiResponse<MarketStatsData>>();

  return response;
}

async function queryTransactionHashes(
  address: string,
  opts?: TransactionHashOpts
): Promise<Record<string, never> | TwilightApiResponse<TransactionHash[]>> {
  const body = JSON.stringify({
    jsonrpc: "2.0",
    method: "transaction_hashes",
    params: {
      AccountId: { id: address, ...opts },
    },
    id: 1,
  });

  const { success, data, error } = await wfetch(priceURL)
    .post({ body })
    .json<TwilightApiResponse<TransactionHash[]>>();

  console.log("queryTransactionHashes", body, data);

  if (!success) {
    console.error(error);
    return {};
  }

  return data;
}

async function queryTransactionHashByRequestId(
  requestId: string,
  opts?: TransactionHashOpts
) {
  const body = JSON.stringify({
    jsonrpc: "2.0",
    method: "transaction_hashes",
    params: {
      RequestId: { id: requestId, ...opts },
    },
    id: 1,
  });

  const { success, data, error } = await wfetch(priceURL)
    .post({ body })
    .json<TwilightApiResponse<TransactionHash[]>>();

  if (!success) {
    console.error(error);
    return {};
  }

  return data;
}

export type WithdrawRequest = {
  withdrawIdentifier: number;
  withdrawAddress: string;
  withdrawReserveId: string;
  withdrawAmount: string;
  twilightAddress: string;
  isConfirmed: boolean;
  CreationTwilightBlockHeight: string;
};

type WithdrawRequestsData = {
  withdrawRequest: WithdrawRequest[];
};

async function getWithdrawRequests() {
  const { success, data, error } = await wfetch(
    new URL(REST_URL + "/twilight-project/nyks/bridge/withdraw_btc_request_all")
  )
    .get()
    .json<WithdrawRequestsData>();

  if (!success) {
    console.error("getWithdrawRequests", error);
    return { success, error };
  }

  return { success, data };
}

export {
  getBTCDepositAddress,
  getReserveData,
  getBTCPrice,
  queryTransactionHashes,
  getCandleData,
  getFundingRate,
  getOpenLimitOrders,
  getRecentLimitOrders,
  queryTransactionHashByRequestId,
  getPoolShareValue,
  getLendPoolInfo,
  getLastDayApy,
  getMarketStats,
  getWithdrawRequests,
};
