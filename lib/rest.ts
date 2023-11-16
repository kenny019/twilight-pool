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

export { getBTCDepositAddress };
