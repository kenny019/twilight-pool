import { StateCreator } from "zustand";
import { ZkAccountSlice } from "./slices/accounts";
import { LendSlice } from "./slices/lend";
import { TradeSlice } from "./slices/trade";
import { TradeSessionSlice } from "./session/trade";
import { ChainWalletBase } from "@cosmos-kit/core";

export interface AccountSlices {
  zk: ZkAccountSlice;
  lend: LendSlice;
  trade: TradeSlice;
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
