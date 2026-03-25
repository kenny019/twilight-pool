"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { type StoreApi, Mutate, useStore } from "zustand";
import { SessionSlices } from "../state/utils";
import { createSessionStore } from "../state/store";
import { useWallet } from "@cosmos-kit/react-lite";
import { WalletStatus } from "@cosmos-kit/core";
import { generateSignMessage } from "../twilight/chain";
import { detectInAppBrowser } from "../wallets/detect";
import useIsMounted from "../hooks/useIsMounted";
import dayjs from "dayjs";
import { CandleInterval } from "../types";
import { getCandleData } from "../api/rest";

// ---------------------------------------------------------------------------
// Sign status — tracks the "Hello Twilight!" signature request lifecycle
// ---------------------------------------------------------------------------

export type SignStatus = "idle" | "pending" | "signed" | "rejected" | "skipped";

interface SignStatusContextValue {
  signStatus: SignStatus;
  retrySign: () => Promise<void>;
  skipSign: () => void;
}

const signStatusContext = createContext<SignStatusContextValue>({
  signStatus: "idle",
  retrySign: async () => {},
  skipSign: () => {},
});

export const useSignStatus = () => useContext(signStatusContext);

// ---------------------------------------------------------------------------
// Session store context
// ---------------------------------------------------------------------------

export const sessionStoreContext =
  createContext<StoreApi<SessionSlices> | null>(null);

export interface sessionStoreProviderProps {
  children: React.ReactNode;
}

export const SessionStoreProvider = ({
  children,
}: sessionStoreProviderProps) => {
  const storeRef =
    useRef<
      Mutate<
        StoreApi<SessionSlices>,
        [["zustand/persist", SessionSlices], ["zustand/immer", never]]
      >
    >();

  if (!storeRef.current) {
    storeRef.current = createSessionStore();
  }

  const { mainWallet, status } = useWallet();
  const [isHydrated, setIsHydrated] = useState(false);
  const [signStatus, setSignStatus] = useState<SignStatus>("idle");

  const chainWallet = mainWallet?.getChainWallet("nyks");
  const isMounted = useIsMounted();

  // Shared sign helper — updates status and stores the key on success
  const requestSign = useCallback(async (): Promise<boolean> => {
    const cw = mainWallet?.getChainWallet("nyks");
    const addr = cw?.address;
    if (!cw || !addr || !storeRef.current) return false;

    setSignStatus("pending");

    const [, newPrivateKey] = await generateSignMessage(
      cw,
      addr,
      "Hello Twilight!"
    );

    if (newPrivateKey) {
      storeRef.current.getState().setPrivateKey(newPrivateKey as string);
      setSignStatus("signed");
      return true;
    }

    // User rejected or sign failed
    setSignStatus("rejected");
    return false;
  }, [mainWallet]);

  const retrySign = useCallback(async () => {
    await requestSign();
  }, [requestSign]);

  const skipSign = useCallback(() => {
    setSignStatus("skipped");
  }, []);

  async function generateTwilightPrivateKey() {
    if (status !== WalletStatus.Connected || !storeRef.current || !isHydrated)
      return;

    // Don't auto-fire sign request on /add-chain page
    if (
      typeof window !== "undefined" &&
      window.location.pathname === "/add-chain"
    )
      return;

    const chainWallet = mainWallet?.getChainWallet("nyks");
    const existingPrivateKey = storeRef.current.getState().privateKey;

    if (!chainWallet || existingPrivateKey) {
      // Already signed — sync status
      if (existingPrivateKey) setSignStatus("signed");
      return;
    }

    const twilightAddress = chainWallet.address;

    if (!twilightAddress) {
      return;
    }

    // In-app browsers: delay before sign to avoid racing chain addition
    if (detectInAppBrowser()) {
      await new Promise((r) => setTimeout(r, 1500));
    }

    const success = await requestSign();
    if (!success) return;
    setIsHydrated(false);
  }

  function useGenerateTwilightPrivateKey() {
    useEffect(() => {
      generateTwilightPrivateKey();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isHydrated]);
  }

  function useRehydrateSessionStore() {
    useEffect(() => {
      async function rehydrateSessionStore() {
        if (!storeRef.current) {
          return;
        }

        if (!chainWallet?.address) {
          storeRef.current.persist.setOptions({
            name: `twilight-session-`,
          });

          const oldPrice = storeRef.current.getState().price;
          storeRef.current.setState({
            ...storeRef.current.getInitialState(),
            price: oldPrice,
          });

          setSignStatus("idle");
          return;
        }

        // In-app browsers: cosmos-kit auto-reconnects and calls
        // experimentalSuggestChain during _restoreAccounts. Wait for the
        // connection to fully settle before sending the sign request,
        // otherwise both hit the wallet simultaneously and crash Keplr.
        if (detectInAppBrowser() && status !== WalletStatus.Connected) {
          return;
        }

        const chainAddress = chainWallet.address;

        if (!chainAddress) return;

        storeRef.current.persist.setOptions({
          name: `twilight-session-${chainAddress}`,
        });

        const oldState = storeRef.current.getState();

        await storeRef.current.persist.rehydrate();

        const newState = storeRef.current.getState();

        // On /add-chain page, only rehydrate the store — don't fire the
        // sign request. The user is there to add the chain, not to trade.
        const isAddChainPage =
          typeof window !== "undefined" &&
          window.location.pathname === "/add-chain";

        if (oldState === newState) {
          if (isAddChainPage) {
            const oldPrice = storeRef.current.getState().price;
            storeRef.current.setState({
              ...storeRef.current.getInitialState(),
              price:
                oldPrice.btcPrice === 0
                  ? storeRef.current.getState().price
                  : oldPrice,
            });
          } else {
            const oldPrice = storeRef.current.getState().price;

            // In-app browsers: Keplr crashes if the sign request arrives
            // immediately after chain addition. Give it time to settle.
            if (detectInAppBrowser()) {
              await new Promise((r) => setTimeout(r, 1500));
            }

            setSignStatus("pending");
            const [, newPrivateKey] = await generateSignMessage(
              chainWallet,
              chainAddress,
              "Hello Twilight!"
            );

            if (newPrivateKey) {
              storeRef.current.setState({
                ...storeRef.current.getInitialState(),
                price:
                  oldPrice.btcPrice === 0
                    ? storeRef.current.getState().price
                    : oldPrice,
                privateKey: newPrivateKey as string,
              });
              setSignStatus("signed");
            } else {
              storeRef.current.setState({
                ...storeRef.current.getInitialState(),
                price:
                  oldPrice.btcPrice === 0
                    ? storeRef.current.getState().price
                    : oldPrice,
              });
              setSignStatus("rejected");
            }
          }
        } else {
          // Rehydrated existing session — privateKey already present
          if (newState.privateKey) {
            setSignStatus("signed");
          }
        }

        setIsHydrated(true);
      }

      rehydrateSessionStore();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [chainWallet?.address, status]);
  }

  function useOnMount() {
    useEffect(() => {
      if (!isMounted) return;

      const hasPrice = storeRef.current?.getState().price.btcPrice;

      if (!!hasPrice) return;

      async function setBtcPrice() {
        const candleDataResponse = await getCandleData({
          since: dayjs().subtract(1, "m").toISOString(),
          interval: CandleInterval.ONE_MINUTE,
          limit: 1,
        });

        const candleData = candleDataResponse.success
          ? candleDataResponse.data.result
          : [];

        if (candleData.length > 0) {
          storeRef.current
            ?.getState()
            .price.setPrice(
              parseFloat(candleData[candleData.length - 1].close) || 0
            );
        }
      }

      setBtcPrice();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isMounted]);
  }

  useOnMount();
  useGenerateTwilightPrivateKey();
  useRehydrateSessionStore();

  const signCtx = { signStatus, retrySign, skipSign };

  return (
    <signStatusContext.Provider value={signCtx}>
      <sessionStoreContext.Provider value={storeRef.current}>
        {children}
      </sessionStoreContext.Provider>
    </signStatusContext.Provider>
  );
};

export const useSessionStore = <T,>(
  selector: (store: SessionSlices) => T
): T => {
  const sessionStoreCtx = useContext(sessionStoreContext);

  if (!sessionStoreCtx) {
    throw new Error(`useSessionStore must be use within SessionStoreProvider`);
  }

  return useStore(sessionStoreCtx, selector);
};
