import { useEffect, useState } from "react";
import wfetch from "../http";
import { registeredBtcAddressStruct } from "../types";
import { ChainWalletBase, MainWalletBase } from "@cosmos-kit/core";

type getResponseData = {
  addresses: registeredBtcAddressStruct[];
};

type SuccessResponse = {
  success: true;
  data: registeredBtcAddressStruct;
  error: undefined;
};

type ErrorResponse = {
  success: false;
  data: undefined;
  error: unknown;
};

const restURL = process.env.NEXT_PUBLIC_TWILIGHT_API_REST as string;

export default function useGetRegisteredBtcAddress(
  mainWallet?: MainWalletBase,
  chainWallet?: ChainWalletBase
): SuccessResponse | ErrorResponse | undefined {
  const [response, setResponse] = useState<
    SuccessResponse | ErrorResponse | undefined
  >();

  useEffect(() => {
    async function request() {
      const { success, data, error } = await wfetch(
        `${restURL}/twilight-project/nyks/bridge/registered_btc_deposit_addresses`
      )
        .get()
        .json<getResponseData>();

      if (!success) {
        setResponse({
          success: false,
          data: undefined,
          error: error,
        });
        return;
      }

      const twilightAddress = chainWallet?.address;
      const filtered = data.addresses.filter(
        (struct) => struct.twilightAddress === twilightAddress
      );

      if (filtered.length < 1) {
        setResponse({
          success: false,
          data: undefined,
          error: error,
        });
        return;
      }

      setResponse({
        success: true,
        data: filtered[0],
        error: undefined,
      });
    }

    if (mainWallet === undefined) return;

    if (!mainWallet.isWalletConnected) {
      setResponse({
        success: false,
        error: "wallet is not connected", // todo: enum of standard error messages
        data: undefined,
      });

      return;
    }
    request();
  }, [mainWallet, chainWallet]);

  return response;
}
