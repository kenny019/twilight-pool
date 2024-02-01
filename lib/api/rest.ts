import wfetch from "../http";
import { twilightRegistedBtcAddressStruct } from "../types";

const REST_URL = process.env.NEXT_PUBLIC_TWILIGHT_API_REST as string;

async function getBTCDepositAddress(depositAddress: string) {
  const { success, data, error } = await wfetch(
    new URL(
      `/twilight-project/nyks/bridge/registered_btc_deposit_address_by_twilight_address/${depositAddress}`,
      REST_URL
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

// todo: refactor into seperate files
const priceURL = process.env.NEXT_PUBLIC_TWILIGHT_PRICE_REST as string;
export type PriceFeedResponseData = {
  jsonrpc: string;
  id: number;
  result: {
    id: string;
    price: string;
    timestamp: string;
  };
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
    .json<PriceFeedResponseData>();

  return response;
}

export { getBTCDepositAddress, getBTCPrice };