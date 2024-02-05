import { StateCreator } from "zustand";
import { ZkAccountSlice } from "./slices/accounts";

export interface AccountSlices {
  zk: ZkAccountSlice;
}

export type StateImmerCreator<SlicesT, SliceT> = StateCreator<
  SlicesT,
  [["zustand/immer", never]],
  [],
  SliceT
>;
