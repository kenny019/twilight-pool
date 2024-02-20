import { TradeOrder } from "@/lib/types";
import { SessionSlices, StateImmerCreator } from "../utils";

export interface TradeSessionSlice {
  trades: TradeOrder[];
  addTrade: (tradeOrder: TradeOrder) => void;
  removeTrade: (tradeOrder: TradeOrder) => void;
}

export const createSessionTradeSlice: StateImmerCreator<
  SessionSlices,
  TradeSessionSlice
> = (set) => ({
  trades: [],
  addTrade: (tradeOrder) =>
    set((state) => {
      state.trade.trades = [...state.trade.trades, tradeOrder];
    }),
  removeTrade: (tradeOrder) =>
    set((state) => {
      state.trade.trades = state.trade.trades.filter(
        (trade) => trade.accountAddress !== tradeOrder.accountAddress
      );
    }),
});
