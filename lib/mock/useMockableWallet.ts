import { useMemo } from "react";
import { useWallet as useCosmosWallet } from "@cosmos-kit/react-lite";
import { WalletStatus } from "@cosmos-kit/core";
import { IS_MOCK } from "./constants";

let _mockWallet: any;
function getMockWallet() {
  if (!_mockWallet) _mockWallet = require("./wallet").mockMainWallet;
  return _mockWallet;
}

export function useWallet() {
  const real = useCosmosWallet();
  return useMemo(() => {
    if (IS_MOCK) {
      return { ...real, mainWallet: getMockWallet(), status: WalletStatus.Connected };
    }
    return real;
  }, [real]);
}
