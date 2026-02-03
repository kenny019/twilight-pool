import wfetch from "../http";
import { registeredBtcAddressStruct } from "../types";

const REST_URL = process.env.NEXT_PUBLIC_TWILIGHT_API_REST as string;

type GetRegisteredBTCDepositAddressRes = {
  addresses: registeredBtcAddressStruct[];
};

type GetRegisteredBTCAddressByTwilightAddressRes = {
  depositAddress: string;
  twilightDepositAddress: string;
};

type ApiError = {
  code: number;
  message: string;
  details: any[];
};

async function getAllBTCDepositAddress() {
  const { success, data, error } = await wfetch(
    new URL(
      REST_URL + "twilight-project/nyks/bridge/registered_btc_deposit_addresses"
    )
  )
    .get()
    .json<GetRegisteredBTCDepositAddressRes>();

  if (!success || !data.addresses) {
    console.error(error);
    return [];
  }

  return data.addresses;
}

async function getRegisteredBTCAddress(twilightAddress: string) {
  try {
    const { success, data, error } = await wfetch(
      new URL(
        REST_URL +
          `twilight-project/nyks/bridge/registered_btc_deposit_address_by_twilight_address/${twilightAddress}`
      )
    )
      .get()
      .json<GetRegisteredBTCAddressByTwilightAddressRes>();

    if (!success) {
      return "";
    }

    const { depositAddress } = data;

    return depositAddress;
  } catch (err) {
    console.error("Error fetching registered BTC address:", err);
    throw err;
  }
}

export { getAllBTCDepositAddress, getRegisteredBTCAddress };
