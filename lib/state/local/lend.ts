import { LendOrder, PoolInfo } from "@/lib/types";
import { AccountSlices, StateImmerCreator } from "../utils";

export interface LendSlice {
  lends: LendOrder[];
  poolInfo: PoolInfo | null;
  lendHistory: LendOrder[];
  addLend: (lendOrder: LendOrder) => void;
  addLendHistory: (lendOrder: LendOrder) => void;
  removeLendHistory: (lendOrder: LendOrder) => void;
  updateLend: (uuid: string, updates: Partial<LendOrder>) => void;
  removeLend: (lendOrder: LendOrder) => void;
  setPoolInfo: (poolInfo: PoolInfo) => void;
  resetState: () => void;
}

export const initialLendSliceState = {
  lends: [],
  lendHistory: [],
  poolInfo: null,
};

export const createLendSlice: StateImmerCreator<AccountSlices, LendSlice> = (
  set
) => ({
  ...initialLendSliceState,
  addLend: (lendOrder) =>
    set((state) => {
      state.lend.lends = [...state.lend.lends, lendOrder];
    }),
  updateLend: (uuid, updates) =>
    set((state) => {
      const index = state.lend.lends.findIndex((lend) => lend.uuid === uuid);
      if (index !== -1) {
        state.lend.lends[index] = { ...state.lend.lends[index], ...updates };
      }
    }),
  removeLend: (lendOrder) =>
    set((state) => {
      state.lend.lends = state.lend.lends.filter(
        (lend) => lend.uuid !== lendOrder.uuid
      );
    }),
  setPoolInfo: (poolInfo) =>
    set((state) => {
      state.lend.poolInfo = poolInfo;
    }),
  addLendHistory: (lendOrder) =>
    set((state) => {
      state.lend.lendHistory = [...state.lend.lendHistory, lendOrder];
    }),
  removeLendHistory: (lendOrder) =>
    set((state) => {
      state.lend.lendHistory = state.lend.lendHistory.filter(
        (lend) => lend.uuid !== lendOrder.uuid
      );
    }),
  resetState: () => {
    set((state) => {
      state.lend = {
        ...state.lend,
        ...initialLendSliceState,
      };
    });
  },
});
