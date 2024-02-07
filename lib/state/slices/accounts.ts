import { ZkAccount } from "@/lib/types";
import { AccountSlices, StateImmerCreator } from "../utils";
import { immer } from "zustand/middleware/immer";

export interface ZkAccountSlice {
  selectedZkAccount: number;
  updateSelectedZkccount: (index: number) => void;
  zkAccounts: ZkAccount[];
  updateZkAccount: (zkAddress: string, updatedZkAccount: ZkAccount) => void;
  addZkAccount: (zkAccount: ZkAccount) => void;
  removeZkAccount: (zkAccount: ZkAccount) => void;
}

export const createZkAccountSlice: StateImmerCreator<
  AccountSlices,
  ZkAccountSlice
> = (set) => ({
  selectedZkAccount: -1,
  updateSelectedZkccount: (index) =>
    set((state) => {
      state.zk.selectedZkAccount = index;
    }),
  zkAccounts: [],
  updateZkAccount: (zkAddress, updatedZkAccount) => {
    set((state) => {
      state.zk.zkAccounts = state.zk.zkAccounts.map((account) => {
        if (account.address !== zkAddress) return account;
        return updatedZkAccount;
      });
    });
  },
  addZkAccount: (zkAccount) =>
    set((state) => {
      state.zk.zkAccounts = [...state.zk.zkAccounts, zkAccount];
    }),
  removeZkAccount: (zkAccount) => {
    set((state) => {
      state.zk.zkAccounts = state.zk.zkAccounts.filter(
        (account) => account.address !== zkAccount.address
      );
    });
  },
});
