import { StateCreator } from "zustand";
import { ZkAccountSlice } from "./slices/accounts";
import { LendSlice } from "./slices/lend";
import { TradeSlice } from "./slices/trade";

export interface AccountSlices {
  zk: ZkAccountSlice;
  lend: LendSlice;
  trade: TradeSlice;
}

export type StateImmerCreator<SlicesT, SliceT> = StateCreator<
  SlicesT,
  [["zustand/immer", never]],
  [],
  SliceT
>;
