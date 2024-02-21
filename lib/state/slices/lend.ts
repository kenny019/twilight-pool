import { LendOrder } from "@/lib/types";
import { AccountSlices, StateImmerCreator } from "../utils";

export interface LendSlice {
  lends: LendOrder[];
  addLend: (lendOrder: LendOrder) => void;
  removeLend: (lendOrder: LendOrder) => void;
  resetState: () => void;
}

export const initialLendSliceState = {
  lends: [],
};

export const createLendSlice: StateImmerCreator<AccountSlices, LendSlice> = (
  set
) => ({
  ...initialLendSliceState,
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
  resetState: () => {
    set((state) => {
      state.lend = {
        ...state.lend,
        ...initialLendSliceState,
      };
    });
  },
});
