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
import { createZkAccount, syncOnChainZkAccounts } from "../twilight/zk";
import { ZK_ACCOUNT_INDEX } from "../constants";
import { useSessionStore } from "./session";
import { getBlockHeight } from "../twilight/chain";

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

  const [isHydrated, setIsHydrated] = useState(false);

  if (!storeRef.current) {
    storeRef.current = createTwilightStore();
  }

  const { status, mainWallet } = useWallet();
  const privateKey = useSessionStore((state) => state.privateKey);

  const chainWallet = mainWallet?.getChainWallet("nyks");

  function useRehydrateLocalStore() {
    useEffect(() => {
      async function rehydrateLocalStore() {
        setIsHydrated(false);

        if (!storeRef.current) {
          return;
        }

        if (!chainWallet?.address) {
          storeRef.current.persist.setOptions({
            name: `twilight-`,
          });

          storeRef.current.setState(storeRef.current.getInitialState());
          return;
        }

        const chainAddress = chainWallet.address;

        console.log("rehydrating local data", chainAddress);
        storeRef.current.persist.setOptions({
          name: `twilight-${chainAddress}`,
        });

        await storeRef.current.persist.rehydrate();

        setIsHydrated(true);
      }
      rehydrateLocalStore();
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
    }, [isHydrated]);
  }

  function useInitZkAccount() {
    useEffect(() => {
      async function initZkAccount() {
        if (!storeRef.current || !isHydrated || !privateKey) return;

        if (!chainWallet?.address) return;

        console.log("CHECKING INIT ZKACCOUNT");

        const zkAccounts = storeRef.current.getState().zk.zkAccounts;

        const addZkAccount = storeRef.current.getState().zk.addZkAccount;

        const hasMainZkAccount =
          zkAccounts.filter((account) => account.tag === "main").length > 0;

        if (!hasMainZkAccount) {
          console.log("initialising new zk account");

          const account = await createZkAccount({
            tag: "main",
            signature: privateKey,
          });

          addZkAccount({
            ...account,
            value: 0,
            isOnChain: false,
          });
        }
      }

      initZkAccount();
    }, [isHydrated, chainWallet?.address, privateKey]);
  }

  function useSyncZkAccounts() {
    useEffect(() => {
      async function syncZkAccounts() {
        if (!storeRef.current || !isHydrated || !privateKey) return;

        if (!chainWallet?.address) return;

        const height = await getBlockHeight(chainWallet);

        if (!height) return;

        const oldHeight = storeRef.current.getState().zk.blockHeight;

        // storeRef.current.getState().zk.updateBlockHeight(height);
        await syncOnChainZkAccounts({
          startBlock: oldHeight,
          endBlock: height,
          signature: privateKey,
        });
      }

      syncZkAccounts();
    }, [isHydrated, chainWallet?.address, privateKey]);
  }

  useSyncZkAccounts();
  useInitZkAccount();
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
