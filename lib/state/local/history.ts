import { TransactionHistory } from "@/lib/types";
import { AccountSlices, StateImmerCreator } from "../utils";
import { buildLedgerEntryFromTransaction } from "@/lib/account-ledger/from-transaction";

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

      const ledgerEntry = buildLedgerEntryFromTransaction(state, transaction);
      const index = state.account_ledger.entries.findIndex(
        (entry) => entry.idempotency_key === ledgerEntry.idempotency_key
      );

      if (index >= 0) {
        // Transaction-derived rows are immutable snapshots; ignore duplicates.
        return;
      }

      state.account_ledger.entries.unshift(ledgerEntry);
    }),
  removeTransaction: (transaction) =>
    set((state) => {
      state.history.transactions = state.history.transactions.filter(
        (tx) => tx.tx_hash !== transaction.tx_hash
      );
    }),
  resetState: () => {
    set((state) => {
      state.history = {
        ...state.history,
        ...initialHistorySliceState,
      };
    });
  },
});
