"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { type StoreApi, Mutate, useStore } from "zustand";
import { SessionSlices } from "../state/utils";
import { createSessionStore } from "../state/store";
import { useWallet } from "@cosmos-kit/react-lite";
import { WalletStatus } from "@cosmos-kit/core";
import { generateSignMessage } from "../twilight/chain";

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
        [["zustand/persist", never], ["zustand/immer", never]]
      >
    >();

  if (!storeRef.current) {
    storeRef.current = createSessionStore();
  }

  const { mainWallet, status } = useWallet();
  const [isHydrated, setIsHydrated] = useState(false);

  const chainWallet = mainWallet?.getChainWallet("nyks");

  async function generateTwilightPrivateKey() {
    if (status !== WalletStatus.Connected || !storeRef.current || !isHydrated)
      return;

    const chainWallet = mainWallet?.getChainWallet("nyks");
    const existingPrivateKey = storeRef.current.getState().privateKey;

    if (!chainWallet || existingPrivateKey) {
      return;
    }

    const twilightAddress = chainWallet.address;

    if (!twilightAddress) {
      return;
    }

    const [_, newPrivateKey] = await generateSignMessage(
      chainWallet,
      twilightAddress,
      "Hello Twilight!"
    );

    storeRef.current.getState().setPrivateKey(newPrivateKey as string);
    setIsHydrated(false);
  }

  function useGenerateTwilightPrivateKey() {
    useEffect(() => {
      generateTwilightPrivateKey();
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

        if (oldState === newState) {
          const oldPrice = storeRef.current.getState().price;

          const [_, newPrivateKey] = await generateSignMessage(
            chainWallet,
            chainAddress,
            "Hello Twilight!"
          );

          storeRef.current.setState({
            ...storeRef.current.getInitialState(),
            price:
              oldPrice.btcPrice === 0
                ? storeRef.current.getState().price
                : oldPrice,
            privateKey: newPrivateKey as string,
          });
        }

        setIsHydrated(true);
      }

      rehydrateSessionStore();
    }, [chainWallet?.address]);
  }

  useGenerateTwilightPrivateKey();
  useRehydrateSessionStore();

  return (
    <sessionStoreContext.Provider value={storeRef.current}>
      {children}
    </sessionStoreContext.Provider>
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
