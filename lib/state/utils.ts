import { StateCreator } from "zustand";
import { ZkAccountSlice } from "./local/accounts";
import { LendSlice } from "./local/lend";
import { TradeSlice } from "./local/trade";
import { TradeSessionSlice } from "./session/trade";
import { HistorySlice } from "./local/history";
import { PriceSlice } from "./local/price";

export interface AccountSlices {
  zk: ZkAccountSlice;
  lend: LendSlice;
  trade: TradeSlice;
  history: HistorySlice;
  price: PriceSlice;
}

export interface SessionSlices {
  trade: TradeSessionSlice;
  twilightAddress: string;
  privateKey: string;
  setPrivateKey: (privateKey: string) => void;
}

export type StateImmerCreator<SlicesT, SliceT> = StateCreator<
  SlicesT,
  [["zustand/immer", never]],
  [],
  SliceT
>;
