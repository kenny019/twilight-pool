import { AccountLedgerEntry } from "@/lib/types";
import { AccountSlices, StateImmerCreator } from "../utils";

export interface AccountLedgerSlice {
  entries: AccountLedgerEntry[];
  addEntry: (entry: AccountLedgerEntry) => void;
  removeEntry: (entry: AccountLedgerEntry) => void;
  resetState: () => void;
}

export const initialAccountLedgerSliceState = {
  entries: [] as AccountLedgerEntry[],
};

export const createAccountLedgerSlice: StateImmerCreator<
  AccountSlices,
  AccountLedgerSlice
> = (set) => ({
  ...initialAccountLedgerSliceState,
  addEntry: (entry) =>
    set((state) => {
      const index = state.account_ledger.entries.findIndex(
        (existing) => existing.idempotency_key === entry.idempotency_key
      );

      if (index >= 0) {
        const existing = state.account_ledger.entries[index];
        const nextStatus =
          existing.status === "pending" && entry.status !== "pending"
            ? entry.status
            : existing.status;

        // Keep historical snapshot fields immutable on duplicate events.
        // Only patch lightweight metadata that may arrive later.
        state.account_ledger.entries[index] = {
          ...existing,
          status: nextStatus,
          tx_hash: existing.tx_hash || entry.tx_hash || null,
          order_id: existing.order_id || entry.order_id || null,
          remarks: existing.remarks || entry.remarks || null,
          updated_at: new Date(),
        };
        return;
      }

      state.account_ledger.entries.unshift(entry);
    }),
  removeEntry: (entry) =>
    set((state) => {
      state.account_ledger.entries = state.account_ledger.entries.filter(
        (item) => item.idempotency_key !== entry.idempotency_key
      );
    }),
  resetState: () => {
    set((state) => {
      state.account_ledger = {
        ...state.account_ledger,
        ...initialAccountLedgerSliceState,
      };
    });
  },
});
