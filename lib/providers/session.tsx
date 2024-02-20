"use client";

import { createContext, useContext, useEffect, useRef } from "react";
import { type StoreApi, Mutate, useStore } from "zustand";
import { SessionSlices } from "../state/utils";
import { createSessionStore } from "../state/store";
import { useWallet } from "@cosmos-kit/react-lite";

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

  const { mainWallet } = useWallet();

  const chainWallet = mainWallet?.getChainWallet("nyks");

  function useRehydrateSessionStore() {
    useEffect(() => {
      async function updateTwilightStore() {
        const twilightAddress = chainWallet?.address || "";

        if (!twilightAddress || !storeRef.current) return;

        const options = storeRef.current.persist.getOptions();

        if (
          options.name === "twilight-session-" ||
          options.name === `twilight-session-${twilightAddress}`
        ) {
          return;
        }

        storeRef.current.persist.setOptions({
          name: `twilight-session-${twilightAddress}`,
        });

        await storeRef.current.persist.rehydrate();

        console.log(`3. rehydrated twilight-session-${twilightAddress}`);
      }

      updateTwilightStore();
    }, [chainWallet?.address]);
  }

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
