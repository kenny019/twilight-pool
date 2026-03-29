import { FundingHistoryEntry, TradeOrder } from "@/lib/types";
import { AccountSlices, StateImmerCreator } from "../utils";

/** Fields that can be updated on an existing history row via upsert. */
const UPSERT_FIELDS = [
  "tx_hash",
  "reason",
  "old_price",
  "new_price",
  "displayPrice",
  "displayPriceBefore",
  "displayPriceAfter",
  // Snapshot fields refreshed from traderOrderInfo
  "availableMargin",
  "initialMargin",
  "maintenanceMargin",
  "liquidationPrice",
  "settlementPrice",
  "realizedPnl",
  "unrealizedPnl",
  "settleLimit",
  "takeProfit",
  "stopLoss",
  "fundingApplied",
] as const;

export interface TradeHistorySlice {
  trades: TradeOrder[];
  addTrade: (tradeOrder: TradeOrder) => void;
  removeTrade: (tradeOrder: TradeOrder) => void;
  updateTradeFundingHistory: (
    uuid: string,
    fundingHistory: FundingHistoryEntry[]
  ) => void;
  updateHistorySnapshot: (
    uuid: string,
    orderStatus: string,
    fields: Partial<TradeOrder>
  ) => void;
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
      const key = tradeOrder.idempotency_key;

      if (key) {
        // 1. Exact match by idempotency_key — upsert mutable fields
        const exactMatch = state.trade_history.trades.find(
          (t) => t.idempotency_key === key
        );
        if (exactMatch) {
          for (const field of UPSERT_FIELDS) {
            const incoming = tradeOrder[field as keyof TradeOrder];
            if (incoming !== undefined) {
              (exactMatch as Record<string, unknown>)[field] = incoming;
            }
          }
          return;
        }

        // 2. Legacy match — a row with the same (uuid, orderStatus) but no
        //    idempotency_key. Upgrade it in-place instead of inserting a duplicate.
        const legacyMatch = state.trade_history.trades.find(
          (t) =>
            !t.idempotency_key &&
            t.uuid === tradeOrder.uuid &&
            t.orderStatus === tradeOrder.orderStatus
        );
        if (legacyMatch) {
          // Upgrade the legacy row with event metadata + mutable fields
          legacyMatch.idempotency_key = key;
          legacyMatch.eventSource = tradeOrder.eventSource;
          legacyMatch.eventStatus = tradeOrder.eventStatus;
          legacyMatch.request_id = tradeOrder.request_id;
          legacyMatch.priceKind = tradeOrder.priceKind;
          legacyMatch.eventTimestamp = tradeOrder.eventTimestamp;
          for (const field of UPSERT_FIELDS) {
            const incoming = tradeOrder[field as keyof TradeOrder];
            if (incoming !== undefined) {
              (legacyMatch as Record<string, unknown>)[field] = incoming;
            }
          }
          return;
        }
      } else {
        // No idempotency_key — legacy dedupe by (uuid, orderStatus)
        const exists = state.trade_history.trades.some(
          (t) =>
            t.uuid === tradeOrder.uuid &&
            t.orderStatus === tradeOrder.orderStatus
        );
        if (exists) return;
      }

      // Fee normalization: zero out fees for non-FILLED/SETTLED statuses
      const status = tradeOrder.eventStatus ?? tradeOrder.orderStatus;
      if (status !== "FILLED" && status !== "SETTLED") {
        tradeOrder.feeFilled = 0;
        tradeOrder.feeSettled = 0;
      }

      state.trade_history.trades.unshift(tradeOrder);
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
  updateHistorySnapshot: (uuid, orderStatus, fields) =>
    set((state) => {
      for (const trade of state.trade_history.trades) {
        if (trade.uuid === uuid && trade.orderStatus === orderStatus) {
          Object.assign(trade, fields);
        }
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
          !trades.some((incomingTrade) => {
            // Match by idempotency_key if available, else legacy (uuid, orderStatus)
            if (incomingTrade.idempotency_key && currentTrade.idempotency_key) {
              return (
                incomingTrade.idempotency_key === currentTrade.idempotency_key
              );
            }
            return (
              incomingTrade.uuid === currentTrade.uuid &&
              incomingTrade.orderStatus === currentTrade.orderStatus
            );
          })
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
