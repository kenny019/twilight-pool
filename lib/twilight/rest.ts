import wfetch from "../http";
import { registeredBtcAddressStruct } from "../types";

const REST_URL = process.env.NEXT_PUBLIC_TWILIGHT_API_REST as string;

type GetRegisteredBTCDepositAddressRes = {
  addresses: registeredBtcAddressStruct[];
};

async function getRegisteredBTCDepositAddress() {
  const { success, data, error } = await wfetch(
    new URL(
      "twilight-project/nyks/bridge/registered_btc_deposit_addresses",
      REST_URL
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

export { getRegisteredBTCDepositAddress };
