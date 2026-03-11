import { FundingHistoryEntry, TradeOrder } from "@/lib/types";
import { AccountSlices, StateImmerCreator } from "../utils";

export interface TradeHistorySlice {
  trades: TradeOrder[];
  addTrade: (tradeOrder: TradeOrder) => void;
  removeTrade: (tradeOrder: TradeOrder) => void;
  updateTradeFundingHistory: (uuid: string, fundingHistory: FundingHistoryEntry[]) => void;
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
      const exists = state.trade_history.trades.some(
        (t) =>
          t.uuid === tradeOrder.uuid &&
          t.orderStatus === tradeOrder.orderStatus
      );
      if (!exists) {
        state.trade_history.trades.unshift(tradeOrder);
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
  updateTradeFundingHistory: (uuid, fundingHistory) =>
    set((state) => {
      const trade = state.trade_history.trades.find((t) => t.uuid === uuid);
      if (trade) {
        trade.fundingHistory = fundingHistory;
      }
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
            (incomingTrade) =>
              incomingTrade.uuid === currentTrade.uuid &&
              incomingTrade.orderStatus === currentTrade.orderStatus
          )
      );

      const mergedTrades = [...trades, ...newLocalTrades].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      // Skip update if data hasn't changed
      if (JSON.stringify(currentTrades) === JSON.stringify(mergedTrades)) {
        return;
      }

      state.trade_history.trades = mergedTrades;
    });
  },
});
