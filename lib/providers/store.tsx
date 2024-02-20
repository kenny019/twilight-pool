"use client";

import { type StoreApi, Mutate, useStore } from "zustand";

import { createTwilightStore } from "../state/store";
import { type AccountSlices } from "../state/utils";
import React, { createContext, useContext, useEffect, useRef } from "react";
import { useTwilight } from "./twilight";
import { useWallet } from "@cosmos-kit/react-lite";
import { WalletStatus } from "@cosmos-kit/core";
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

  const zkAccounts = storeRef.current.getState().zk.zkAccounts;
  const addZkAccount = storeRef.current.getState().zk.addZkAccount;
  const selectedZkAccount = storeRef.current.getState().zk.selectedZkAccount;
  const updateSelectedZkAccount =
    storeRef.current.getState().zk.updateSelectedZkAccount;
  const storedTwilightAddress = storeRef.current.getState().zk.twilightAddress;
  const updateTwilightAddress =
    storeRef.current.getState().zk.updateTwilightAddress;

  useEffect(() => {
    if (!storeRef.current) return;

    if (status !== WalletStatus.Connected) return;

    console.log("calling on finish hydration");
    const unsub = storeRef.current.persist.onFinishHydration(async (state) => {
      const hasMainZkAccount =
        state.zk.zkAccounts.filter((account) => account.tag === "main").length >
        0;

      console.log("hasMainZkAccount", hasMainZkAccount);
      if (hasMainZkAccount) return;

      const account = await createZkAccount({
        tag: "main",
        signature: quisPrivateKey,
      });

      state.zk.addZkAccount({
        ...account,
        value: 0,
        isOnChain: false,
      });

      console.log("post hydration: initialising main zk account", account);
    });

    return () => unsub();
  }, [status, quisPrivateKey]);

  useEffect(() => {
    if (status !== "Disconnected" && status !== "Connecting") return;

    console.log("cleanup localstorage store");
    storeRef.current?.persist.clearStorage();
  }, [status]);

  function useInitializeMainZkAccount() {
    useEffect(() => {
      if (status !== WalletStatus.Connected || !quisPrivateKey) {
        return;
      }

      async function storeTwilightAddress() {
        const chainAddress = chainWallet?.address;

        if (!chainAddress) return;

        if (storedTwilightAddress || storedTwilightAddress === chainAddress)
          return;

        updateTwilightAddress(chainAddress);
      }

      storeTwilightAddress();
    }, [chainWallet?.address, quisPrivateKey]);
  }

  function useResetSelectedZkAccount() {
    useEffect(() => {
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

  function useRehydrateTwilightStore() {
    useEffect(() => {
      async function updateTwilightStore() {
        const twilightAddress = chainWallet?.address || "";

        if (!twilightAddress || !storeRef.current) return;

        // if (storedTwilightAddress === twilightAddress) return;

        storeRef.current.persist.setOptions({
          name: `twilight-${twilightAddress}`,
        });

        await storeRef.current.persist.rehydrate();

        console.log(`2. rehydrated twilight-${twilightAddress}`);
      }

      updateTwilightStore();
    }, [chainWallet?.address]);
  }

  useRehydrateTwilightStore();
  useInitializeMainZkAccount();
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
