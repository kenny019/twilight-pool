import wfetch from "./http";
import { twilightRegistedBtcAddressStruct } from "./types";

async function getBTCDepositAddress(depositAddress: string) {
  const restURL = process.env.NEXT_PUBLIC_TWILIGHT_API_REST as string;

  const { success, data, error } = await wfetch(
    `${restURL}/twilight-project/nyks/bridge/registered_btc_deposit_address_by_twilight_address/${depositAddress}`
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
