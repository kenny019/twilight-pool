import { useEffect, useMemo, useState } from "react";
import { useWallet as useCosmosWallet } from "@cosmos-kit/react-lite";
import { WalletStatus } from "@cosmos-kit/core";

// Inlined so SWC replaces this with a literal at build time. A re-export
// from ./constants would defeat dead-code elimination across module
// boundaries on some bundler configurations.
const IS_MOCK = process.env.NEXT_PUBLIC_MOCK_MODE === "true";

type RealWallet = ReturnType<typeof useCosmosWallet>;
type MainWallet = RealWallet["mainWallet"];

function useMockedWallet(): RealWallet {
  const real = useCosmosWallet();
  const [mockMainWallet, setMockMainWallet] = useState<MainWallet | null>(null);

  useEffect(() => {
    let cancelled = false;
    void import("./wallet").then((m) => {
      if (!cancelled)
        setMockMainWallet(m.mockMainWallet as unknown as MainWallet);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return useMemo(
    () => ({
      ...real,
      mainWallet: mockMainWallet ?? real.mainWallet,
      status: mockMainWallet ? WalletStatus.Connected : real.status,
    }),
    [real, mockMainWallet]
  );
}

// Picked at module init from a build-time constant. When IS_MOCK is false,
// useMockedWallet (and its dynamic import of ./wallet) is unreachable and
// dropped by DCE.
export const useWallet = IS_MOCK ? useMockedWallet : useCosmosWallet;
