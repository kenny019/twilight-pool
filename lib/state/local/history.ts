import { TransactionHistory } from "@/lib/types";
import { AccountSlices, StateImmerCreator } from "../utils";

export interface HistorySlice {
  transactions: TransactionHistory[];
  addTransaction: (transaction: TransactionHistory) => void;
  removeTransaction: (transaction: TransactionHistory) => void;
  resetState: () => void;
}

export const initialHistorySliceState = {
  transactions: [],
};

export const createHistorySlice: StateImmerCreator<
  AccountSlices,
  HistorySlice
> = (set) => ({
  ...initialHistorySliceState,
  addTransaction: (transaction) =>
    set((state) => {
      state.history.transactions = [...state.history.transactions, transaction];
    }),
  removeTransaction: (transaction) =>
    set((state) => {
      state.history.transactions = state.history.transactions.filter(
        (tx) => tx.tx_hash !== transaction.tx_hash
      );
    }),
  resetState: () => {
    set((state) => {
      state.trade = {
        ...state.trade,
        ...initialHistorySliceState,
      };
    });
  },
});
