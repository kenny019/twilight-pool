import { WithdrawOrder } from "@/lib/types";
import { AccountSlices, StateImmerCreator } from "../utils";

export interface WithdrawSlice {
  withdrawals: WithdrawOrder[];
  addWithdrawal: (order: WithdrawOrder) => void;
  updateWithdrawal: (
    tx_hash: string,
    updates: Partial<WithdrawOrder>
  ) => void;
  removeWithdrawal: (tx_hash: string) => void;
  resetState: () => void;
}

export const initialWithdrawSliceState = {
  withdrawals: [],
};

export const createWithdrawSlice: StateImmerCreator<
  AccountSlices,
  WithdrawSlice
> = (set) => ({
  ...initialWithdrawSliceState,
  addWithdrawal: (order) =>
    set((state) => {
      state.withdraw.withdrawals = [...state.withdraw.withdrawals, order];
    }),
  updateWithdrawal: (tx_hash, updates) =>
    set((state) => {
      const index = state.withdraw.withdrawals.findIndex(
        (w) => w.tx_hash === tx_hash
      );
      if (index !== -1) {
        state.withdraw.withdrawals[index] = {
          ...state.withdraw.withdrawals[index],
          ...updates,
        };
      }
    }),
  removeWithdrawal: (tx_hash) =>
    set((state) => {
      state.withdraw.withdrawals = state.withdraw.withdrawals.filter(
        (w) => w.tx_hash !== tx_hash
      );
    }),
  resetState: () => {
    set((state) => {
      state.withdraw = {
        ...state.withdraw,
        ...initialWithdrawSliceState,
      };
    });
  },
});
