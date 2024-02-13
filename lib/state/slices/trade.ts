import { TradeOrder } from "@/lib/types";
import { AccountSlices, StateImmerCreator } from "../utils";

export interface TradeSlice {
  trades: TradeOrder[];
  addTrade: () => void;
  removeTrade: () => void;
  updatedTrade: () => void;
}
