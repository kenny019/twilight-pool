"use client";

import { createContext, useContext, useEffect, useRef } from "react";
import { createZkAccountSlice } from "../state/slices/accounts";
import { useAccountStore } from "../state/store";
import { useWallet } from "@cosmos-kit/react-lite";
import { WalletStatus } from "@cosmos-kit/core";
import { useTwilight } from "./twilight";
import { createZkAccount } from "../twilight/zk";
import { ZK_ACCOUNT_INDEX } from "../constants";

type ZkAccountsProviderProps = {
  children: React.ReactNode;
};

type zkStore = ReturnType<typeof createZkAccountSlice>;

export const zkAccountContext = createContext<zkStore | undefined>(undefined);

export const ZkAccountProvider: React.FC<ZkAccountsProviderProps> = (props) => {
  return <ZkAccount {...props} />;
};

const ZkAccount: React.FC<ZkAccountsProviderProps> = ({ children }) => {
  const store = useRef<zkStore>(useAccountStore().zk).current;

  const zkAccounts = useAccountStore((state) => state.zk.zkAccounts);
  const addZkAccount = useAccountStore((state) => state.zk.addZkAccount);

  const { quisPrivateKey } = useTwilight();

  const { status } = useWallet();

  function useInitializeMainZkAccount() {
    useEffect(() => {
      const shouldInit =
        zkAccounts.filter((account) => account.tag === "main").length > 0;

      if (status !== WalletStatus.Connected || !quisPrivateKey || shouldInit) {
        return;
      }

      async function initZkAccount() {
        const account = await createZkAccount({
          tag: "main",
          signature: quisPrivateKey,
        });

        console.log("store", store);
        addZkAccount({ ...account, value: 0, isOnChain: false });

        console.log("Account", account);
      }

      initZkAccount();
    }, [status, quisPrivateKey]);
  }

  function useResetSelectedZkAccount() {
    useEffect(() => {
      if (
        status === "Connected" &&
        store.selectedZkAccount === ZK_ACCOUNT_INDEX.DISCONNECTED
      ) {
        store.updateSelectedZkccount(ZK_ACCOUNT_INDEX.MAIN);
      }

      if (
        status === "Disconnected" &&
        store.selectedZkAccount > ZK_ACCOUNT_INDEX.DISCONNECTED
      ) {
        store.updateSelectedZkccount(ZK_ACCOUNT_INDEX.DISCONNECTED);
      }
    }, [status]);
  }

  useInitializeMainZkAccount();
  useResetSelectedZkAccount();

  return (
    <zkAccountContext.Provider value={store}>
      {children}
    </zkAccountContext.Provider>
  );
};
