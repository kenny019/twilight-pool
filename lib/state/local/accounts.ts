import { PendingMasterAccountRecovery, ZkAccount } from "@/lib/types";
import { AccountSlices, StateImmerCreator } from "../utils";
import { createBlockedMasterAccountState } from "@/lib/utils/masterAccountRecovery";

export interface ZkAccountSlice {
  blockHeight: number;
  updateBlockHeight: (time: number) => void;
  selectedZkAccount: number;
  updateSelectedZkAccount: (index: number) => void;
  zkAccounts: ZkAccount[];
  masterAccountBlocked: boolean;
  masterAccountBlockReason: string | null;
  pendingMasterAccount: PendingMasterAccountRecovery | null;
  updateZkAccount: (zkAddress: string, updatedZkAccount: ZkAccount) => void;
  addZkAccount: (zkAccount: ZkAccount) => void;
  removeZkAccount: (zkAccount: ZkAccount) => void;
  setMasterAccountRecovery: (pending: PendingMasterAccountRecovery) => void;
  clearMasterAccountRecovery: () => void;
  resetState: () => void;
}

export const initialZkAccountSliceState = {
  blockHeight: 0,
  selectedZkAccount: -1,
  zkAccounts: [],
  masterAccountBlocked: false,
  masterAccountBlockReason: null,
  pendingMasterAccount: null,
};

export const createZkAccountSlice: StateImmerCreator<
  AccountSlices,
  ZkAccountSlice
> = (set) => ({
  ...initialZkAccountSliceState,
  updateBlockHeight: (time) =>
    set((state) => {
      state.zk.blockHeight = time;
    }),
  updateSelectedZkAccount: (index) =>
    set((state) => {
      state.zk.selectedZkAccount = index;
    }),
  setMasterAccountRecovery: (pending) =>
    set((state) => {
      Object.assign(state.zk, createBlockedMasterAccountState(pending));
    }),
  clearMasterAccountRecovery: () =>
    set((state) => {
      state.zk.masterAccountBlocked = false;
      state.zk.masterAccountBlockReason = null;
      state.zk.pendingMasterAccount = null;
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
      const accountIndex = state.zk.zkAccounts.findIndex(
        (account) => account.address === zkAccount.address
      );

      if (accountIndex > -1) {
        state.zk.zkAccounts[accountIndex] = {
          ...state.zk.zkAccounts[accountIndex],
          ...zkAccount,
        };
        return;
      }

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
