"use client";

import { type StoreApi, Mutate, useStore } from "zustand";

import { createTwilightStore } from "../state/store";
import { type AccountSlices } from "../state/utils";
import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useTwilight } from "./twilight";
import { useWallet } from "@cosmos-kit/react-lite";
import { createZkAccount } from "../twilight/zk";
import { ZK_ACCOUNT_INDEX } from "../constants";

export const twilightStoreContext =
  createContext<StoreApi<AccountSlices> | null>(null);

export interface twilightStoreProviderProps {
  children: React.ReactNode;
}

export const TwilightStoreProvider = ({
  children,
}: twilightStoreProviderProps) => {
  const storeRef =
    useRef<
      Mutate<
        StoreApi<AccountSlices>,
        [["zustand/persist", never], ["zustand/immer", never]]
      >
    >();

  if (!storeRef.current) {
    storeRef.current = createTwilightStore();
  }

  const { quisPrivateKey } = useTwilight();

  const { status, mainWallet } = useWallet();

  const chainWallet = mainWallet?.getChainWallet("nyks");

  function useRehydrateLocalStore() {
    useEffect(() => {
      async function run() {
        if (!storeRef.current) {
          return;
        }

        if (!chainWallet?.address) {
          storeRef.current.persist.setOptions({
            name: `twilight-`,
          });

          await storeRef.current.persist.rehydrate();
          return;
        }

        const chainAddress = chainWallet.address;

        if (!chainAddress) return console.log("twilight address not found");

        console.log("rehydrating local data", chainAddress);
        storeRef.current.persist.setOptions({
          name: `twilight-${chainAddress}`,
        });

        await storeRef.current.persist.rehydrate();
      }
      run();
    }, [chainWallet?.address]);
  }

  function useResetSelectedZkAccount() {
    useEffect(() => {
      if (!storeRef.current) return;

      const selectedZkAccount =
        storeRef.current.getState().zk.selectedZkAccount;
      const updateSelectedZkAccount =
        storeRef.current.getState().zk.updateSelectedZkAccount;

      if (
        status === "Connected" &&
        selectedZkAccount === ZK_ACCOUNT_INDEX.DISCONNECTED
      ) {
        updateSelectedZkAccount(ZK_ACCOUNT_INDEX.MAIN);
      }

      if (
        status === "Disconnected" &&
        selectedZkAccount > ZK_ACCOUNT_INDEX.DISCONNECTED
      ) {
        updateSelectedZkAccount(ZK_ACCOUNT_INDEX.DISCONNECTED);
      }
    }, [status]);
  }

  useEffect(() => {
    if (!storeRef.current) return;

    const unsubFinishHydration = storeRef.current.persist.onFinishHydration(
      async (state) => {
        if (!chainWallet?.address) return;

        const zkAccounts = state.zk.zkAccounts;

        const addZkAccount = state.zk.addZkAccount;

        const hasMainZkAccount =
          zkAccounts.filter((account) => account.tag === "main").length > 0;

        if (!hasMainZkAccount) {
          console.log("initialising new zk account");

          const account = await createZkAccount({
            tag: "main",
            signature: quisPrivateKey,
          });

          addZkAccount({
            ...account,
            value: 0,
            isOnChain: false,
          });
        }
      }
    );

    return () => {
      unsubFinishHydration();
    };
  }, [chainWallet?.address]);

  useRehydrateLocalStore();
  useResetSelectedZkAccount();

  return (
    <twilightStoreContext.Provider value={storeRef.current}>
      {children}
    </twilightStoreContext.Provider>
  );
};

export const useTwilightStore = <T,>(
  selector: (store: AccountSlices) => T
): T => {
  const twilightStoreCtx = useContext(twilightStoreContext);

  if (!twilightStoreCtx) {
    throw new Error(
      `useTwilightStore must be use within TwilightStoreProvider`
    );
  }

  return useStore(twilightStoreCtx, selector);
};
