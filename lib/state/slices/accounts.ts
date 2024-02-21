import { ZkAccount } from "@/lib/types";
import { AccountSlices, StateImmerCreator } from "../utils";
import { immer } from "zustand/middleware/immer";

export interface ZkAccountSlice {
  twilightAddress: string;
  updateTwilightAddress: (twilightAddress: string) => void;
  selectedZkAccount: number;
  updateSelectedZkAccount: (index: number) => void;
  zkAccounts: ZkAccount[];
  updateZkAccount: (zkAddress: string, updatedZkAccount: ZkAccount) => void;
  addZkAccount: (zkAccount: ZkAccount) => void;
  removeZkAccount: (zkAccount: ZkAccount) => void;
  resetState: () => void;
}

export const initialZkAccountSliceState = {
  twilightAddress: "",
  selectedZkAccount: -1,
  zkAccounts: [],
};

export const createZkAccountSlice: StateImmerCreator<
  AccountSlices,
  ZkAccountSlice
> = (set) => ({
  ...initialZkAccountSliceState,
  updateTwilightAddress: (twilightAddress) =>
    set((state) => {
      state.zk.twilightAddress = twilightAddress;
    }),
  updateSelectedZkAccount: (index) =>
    set((state) => {
      state.zk.selectedZkAccount = index;
    }),
  updateZkAccount: (zkAddress, updatedZkAccount) =>
    set((state) => {
      state.zk.zkAccounts = state.zk.zkAccounts.map((account) => {
        if (account.address !== zkAddress) return account;
        return updatedZkAccount;
      });
    }),
  addZkAccount: (zkAccount) =>
    set((state) => {
      state.zk.zkAccounts = [...state.zk.zkAccounts, zkAccount];
    }),
  removeZkAccount: (zkAccount) =>
    set((state) => {
      state.zk.zkAccounts = state.zk.zkAccounts.filter(
        (account) => account.address !== zkAccount.address
      );
    }),
  resetState: () => {
    set((state) => {
      state.zk = {
        ...state.zk,
        ...initialZkAccountSliceState,
      };
    });
  },
});
