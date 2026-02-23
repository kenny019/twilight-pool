import { TradeOrder } from "@/lib/types";
import { AccountSlices, StateImmerCreator } from "../utils";

export interface TradeHistorySlice {
  trades: TradeOrder[];
  addTrade: (tradeOrder: TradeOrder) => void;
  removeTrade: (tradeOrder: TradeOrder) => void;
  setNewTrades: (trades: TradeOrder[]) => void;
  resetState: () => void;
}

export const initialTradeHistorySliceState = {
  trades: [],
};

export const createTradeHistorySlice: StateImmerCreator<
  AccountSlices,
  TradeHistorySlice
> = (set) => ({
  ...initialTradeHistorySliceState,
  addTrade: (tradeOrder) =>
    set((state) => {
      const idx = state.trade_history.trades.findIndex(
        (trade) => trade.uuid === tradeOrder.uuid
      );
      if (idx >= 0) {
        state.trade_history.trades[idx] = {
          ...state.trade_history.trades[idx],
          ...tradeOrder,
        };
      } else {
        state.trade_history.trades.push(tradeOrder);
      }
    }),
  removeTrade: (tradeOrder) =>
    set((state) => {
      state.trade_history.trades = state.trade_history.trades.map((trade) => {
        if (trade.uuid === tradeOrder.uuid) {
          return {
            ...trade,
            isOpen: false,
          };
        }
        return trade;
      });
    }),

  resetState: () => {
    set((state) => {
      state.trade_history = {
        ...state.trade_history,
        ...initialTradeHistorySliceState,
      };
    });
  },
  setNewTrades: (trades) => {
    set((state) => {
      const currentTrades = state.trade_history.trades;

      const newLocalTrades = currentTrades.filter(
        (currentTrade) =>
          !trades.some(
            (incomingTrade) => incomingTrade.uuid === currentTrade.uuid
          )
      );

      const mergedTrades = [...trades, ...newLocalTrades];

      // Skip update if data hasn't changed
      if (JSON.stringify(currentTrades) === JSON.stringify(mergedTrades)) {
        return;
      }

      state.trade_history.trades = mergedTrades;
    });
  },
});
