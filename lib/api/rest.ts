import wfetch from "../http";
import {
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
const priceURL = process.env.NEXT_PUBLIC_TWILIGHT_PRICE_REST as string;

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

async function getCandleData() {
  const date = new Date();
  date.setMinutes(date.getMinutes() - 15);

  const response = await wfetch(priceURL, {
    next: {
      revalidate: 10,
    },
  })
    .post({
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "candle_data",
        id: 123, // todo: autoincrement
        params: {
          interval: "ONE_MINUTE",
          since: date.toISOString(),
          limit: 15,
          offset: 0,
        },
      }),
      headers: {
        Authorization: `Bearer ${bearerToken}`,
      },
    })
    .json<TwilightApiResponse<CandleData[]>>();

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
  tx_hash: string;
};

async function queryTransactionHashes(
  address: string
): Promise<Record<string, never> | TwilightApiResponse<TransactionHash[]>> {
  const body = JSON.stringify({
    jsonrpc: "2.0",
    method: "transaction_hashes",
    params: {
      AccountId: { id: address },
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

export {
  getBTCDepositAddress,
  getReserveData,
  getBTCPrice,
  queryTransactionHashes,
  getCandleData,
};
