import { TradeOrder } from "@/lib/types";
import { SessionSlices, StateImmerCreator } from "../utils";

type TradeHistory = {
  date: Date;
} & TradeOrder;

export interface TradeSessionSlice {
  trades: TradeHistory[];
  addTrade: (tradeOrder: TradeHistory) => void;
  removeTrade: (tradeOrder: TradeHistory) => void;
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
