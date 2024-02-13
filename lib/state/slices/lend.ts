import { LendOrder } from "@/lib/types";
import { AccountSlices, StateImmerCreator } from "../utils";

export interface LendSlice {
  lends: LendOrder[];
  addLend: (lendOrder: LendOrder) => void;
  removeLend: (lendOrder: LendOrder) => void;
}

export const createLendSlice: StateImmerCreator<AccountSlices, LendSlice> = (
  set
) => ({
  lends: [],
  addLend: (lendOrder) =>
    set((state) => {
      state.lend.lends = [...state.lend.lends, lendOrder];
    }),
  removeLend: (lendOrder) =>
    set((state) => {
      state.lend.lends = state.lend.lends.filter(
        (lend) => lend.accountAddress !== lendOrder.accountAddress
      );
    }),
});
