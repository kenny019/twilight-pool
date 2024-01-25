import { useEffect, useState } from "react";
import { registeredBtcAddressStruct } from "../types";
import { ChainWalletBase, MainWalletBase } from "@cosmos-kit/core";
import { getRegisteredBTCDepositAddress } from "../twilight/rest";

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

export default function useGetRegisteredBTCAddress(
  mainWallet?: MainWalletBase,
  chainWallet?: ChainWalletBase
): SuccessResponse | ErrorResponse | undefined {
  const [response, setResponse] = useState<
    SuccessResponse | ErrorResponse | undefined
  >();

  useEffect(() => {
    async function getRegisteredBTCAddresses() {
      const allRegisteredAddress = await getRegisteredBTCDepositAddress();

      if (allRegisteredAddress.length < 1) {
        setResponse({
          success: false,
          data: undefined,
          error: "Could not query registered BTC Deposit Addresses",
        });
        return;
      }

      const twilightAddress = chainWallet?.address;
      const filtered = allRegisteredAddress.filter(
        (struct) => struct.twilightAddress === twilightAddress
      );

      if (filtered.length < 1) {
        setResponse({
          success: false,
          data: undefined,
          error: "BTC Address has not been registered",
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
        error: "Wallet is not connected", // todo: enum of standard error messages
        data: undefined,
      });

      return;
    }
    getRegisteredBTCAddresses();
  }, [mainWallet, chainWallet]);

  return response;
}
