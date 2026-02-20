import { TradeOrder } from "@/lib/types";
import { AccountSlices, StateImmerCreator } from "../utils";

export interface TradeSlice {
  trades: TradeOrder[];
  addTrade: (tradeOrder: TradeOrder) => void;
  removeTrade: (tradeOrder: TradeOrder) => void;
  updateTrade: (tradeOrder: TradeOrder) => void;
  setNewTrades: (trades: TradeOrder[]) => void;
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
      state.trade.trades = state.trade.trades.map((trade) => {
        if (trade.uuid === tradeOrder.uuid) {
          return {
            ...trade,
            isOpen: false,
          };
        }
        return trade;
      });
    }),
  updateTrade: (tradeOrder) =>
    set((state) => {
      const tradeExists = state.trade.trades.some(
        (trade) => trade.uuid === tradeOrder.uuid
      );

      if (tradeExists) {
        state.trade.trades = state.trade.trades.map((trade) => {
          if (trade.uuid === tradeOrder.uuid) {
            return {
              ...trade,
              ...tradeOrder,
            };
          }
          return trade;
        });
      }
    }),
  resetState: () => {
    set((state) => {
      state.trade = {
        ...state.trade,
        ...initialTradeSliceState,
      };
    });
  },
  setNewTrades: (trades) => {
    set((state) => {
      const incomingTradesMap = new Map(
        trades.map((trade) => [trade.uuid, trade])
      );

      const mergedTrades = [
        ...trades,
        ...state.trade.trades.filter(
          (currentTrade) => !incomingTradesMap.has(currentTrade.uuid)
        ),
      ];

      // Skip update if data hasn't changed
      if (JSON.stringify(state.trade.trades) === JSON.stringify(mergedTrades)) {
        return;
      }

      state.trade.trades = mergedTrades;
    });
  },
});
