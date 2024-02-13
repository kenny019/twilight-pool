import { StateCreator } from "zustand";
import { ZkAccountSlice } from "./slices/accounts";
import { LendSlice } from "./slices/lend";

export interface AccountSlices {
  zk: ZkAccountSlice;
  lend: LendSlice;
}

export type StateImmerCreator<SlicesT, SliceT> = StateCreator<
  SlicesT,
  [["zustand/immer", never]],
  [],
  SliceT
>;
