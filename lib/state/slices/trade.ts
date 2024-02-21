import { TradeOrder } from "@/lib/types";
import { AccountSlices, StateImmerCreator } from "../utils";

export interface TradeSlice {
  trades: TradeOrder[];
  addTrade: (tradeOrder: TradeOrder) => void;
  removeTrade: (tradeOrder: TradeOrder) => void;
  resetState: () => void;
}

export const initialTradeSliceState = {
  trades: [],
};

export const createTradeSlice: StateImmerCreator<AccountSlices, TradeSlice> = (
  set
) => ({
  ...initialTradeSliceState,
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
  resetState: () => {
    set((state) => {
      state.trade = {
        ...state.trade,
        ...initialTradeSliceState,
      };
    });
  },
});
