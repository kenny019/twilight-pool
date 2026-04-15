"use client";

import React, { useState, useMemo, useCallback } from "react";
import { useTwilightStore } from "@/lib/providers/store";
import PositionsTable from "./tables/positions/positions-table.client";
import { useSessionStore } from "@/lib/providers/session";
import { useToast } from "@/lib/hooks/useToast";
import { TradeOrder } from "@/lib/types";
import { cancelZkOrder, settleOrder } from "@/lib/zk/trade";
import Link from "next/link";
import Big from "big.js";
import OpenOrdersTable from "./tables/open-orders/open-orders-table.client";
import TraderHistoryTable from "./tables/trader-history/trader-history-table.client";
import OrderHistoryTable from "./tables/order-history/order-history-table.client";
import OpenOrdersCards from "./tables/open-orders/open-orders-cards.client";
import PositionsCards from "./tables/positions/positions-cards.client";
import TraderHistoryCards from "./tables/trader-history/trader-history-cards.client";
import OrderHistoryCards from "./tables/order-history/order-history-cards.client";
import { buildOrderHistoryGroups } from "./tables/order-history/grouped-order-history";
import { useWallet } from "@cosmos-kit/react-lite";
import { useQueryClient } from "@tanstack/react-query";
import EditOrderDialog from "@/components/edit-order-dialog";
import { Dialog, DialogContent, DialogTitle } from "@/components/dialog";
import Button from "@/components/button";
import cn from "@/lib/cn";
import { formatCurrency } from "@/lib/twilight/ticker";
import {
  ChevronDown,
  ChevronUp,
  LayoutGrid,
  List,
  SlidersHorizontal,
} from "lucide-react";
import useWindow from "@/lib/hooks/useWindow";

// A row in the Open Orders table. Regular rows = plain TradeOrder.
// Rows synthesised from SLTP legs carry `_sltpLeg` to identify which leg they
// represent so the columns can render the right badge / price / cancel action.
export type OpenOrderRow = TradeOrder & { _sltpLeg?: "sl" | "tp" };

type TabType =
  | "history"
  | "trades"
  | "positions"
  | "open-orders"
  | "trader-history";

type ActivityGroup = "live" | "history";

type ViewMode = "table" | "cards";

// State for the "cancel one SLTP leg — ask about the other?" confirmation.
type SltpCancelPending = {
  trade: TradeOrder;
  cancelLeg: "sl" | "tp";
};

// ── Filter chip definitions ────────────────────────────────────────────────
const FILTER_SIDE_CHIPS = [
  { value: "LONG", label: "Long" },
  { value: "SHORT", label: "Short" },
] as const;

const FILTER_STATUS_CHIPS = [
  { value: "PENDING", label: "Open" },
  { value: "FILLED", label: "Filled" },
  { value: "SETTLED", label: "Settled" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "LIQUIDATE", label: "Liquidated" },
] as const;

const FILTER_TYPE_CHIPS = [
  { value: "MARKET", label: "Market" },
  { value: "LIMIT", label: "Limit" },
  { value: "DARK", label: "Dark" },
] as const;

type OrderHistoryFilter = {
  side: Set<string>;
  status: Set<string>;
  type: Set<string>;
};

type TraderHistoryFilter = {
  side: Set<string>;
  status: Set<string>;
};

const DetailsPanel = () => {
  const COMPACT_TRADE_LAYOUT_THRESHOLD = 996;
  const { width } = useWindow();
  const [currentTab, setCurrentTab] = useState<TabType>("positions");
  const [settlingOrders, setSettlingOrders] = useState<Set<string>>(new Set());
  const [cancellingOrders, setCancellingOrders] = useState<Set<string>>(
    new Set()
  );
  const [editDialogOrder, setEditDialogOrder] = useState<TradeOrder | null>(
    null
  );
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingOrders, setEditingOrders] = useState<Set<string>>(new Set());
  const [sltpCancelPending, setSltpCancelPending] =
    useState<SltpCancelPending | null>(null);
  const [viewByTab, setViewByTab] = useState<
    Record<"positions" | "open-orders" | "trader-history" | "history", ViewMode>
  >({
    positions: "cards",
    "open-orders": "cards",
    "trader-history": "table",
    history: "table",
  });
  const [orderHistoryConfigOpen, setOrderHistoryConfigOpen] = useState(false);
  const [orderHistoryFilter, setOrderHistoryFilter] =
    useState<OrderHistoryFilter>({
      side: new Set(),
      status: new Set(),
      type: new Set(),
    });
  const [traderHistoryFilter, setTraderHistoryFilter] =
    useState<TraderHistoryFilter>({ side: new Set(), status: new Set() });
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);

  const tradeOrders = useTwilightStore((state) => state.trade.trades);

  const orderHistoryData = useTwilightStore(
    (state) => state.trade_history.trades
  );
  const privateKey = useSessionStore((state) => state.privateKey);

  const updateZkAccount = useTwilightStore((state) => state.zk.updateZkAccount);

  const zkAccounts = useTwilightStore((state) => state.zk.zkAccounts);
  const addTradeHistory = useTwilightStore(
    (state) => state.trade_history.addTrade
  );
  const updateTrade = useTwilightStore((state) => state.trade.updateTrade);

  const positionsData = useMemo(() => {
    return tradeOrders.filter((trade) => trade.orderStatus === "FILLED");
  }, [tradeOrders]);

  // Base filter: trades that have pending close conditions.
  const openOrdersBase = useMemo(() => {
    return tradeOrders.filter(
      (trade) =>
        trade.orderStatus === "PENDING" ||
        (trade.orderStatus !== "SETTLED" &&
          trade.orderStatus !== "CANCELLED" &&
          (trade.settleLimit || trade.takeProfit || trade.stopLoss))
    );
  }, [tradeOrders]);

  // Explode each SLTP trade into separate SL and TP rows so the user sees
  // them as independent orders, matching the Binance-style UX.
  const openOrdersRows = useMemo((): OpenOrderRow[] => {
    const rows: OpenOrderRow[] = [];
    for (const trade of openOrdersBase) {
      if (trade.orderStatus === "PENDING") {
        rows.push(trade);
        continue;
      }
      // Limit close order row
      if (trade.settleLimit) {
        rows.push(trade);
      }
      // Stop Loss row
      if (trade.stopLoss) {
        rows.push({ ...trade, _sltpLeg: "sl" });
      }
      // Take Profit row
      if (trade.takeProfit) {
        rows.push({ ...trade, _sltpLeg: "tp" });
      }
    }
    return rows;
  }, [openOrdersBase]);

  const traderHistoryData = useMemo(() => {
    return orderHistoryData.filter(
      (trade) =>
        trade.orderStatus === "SETTLED" ||
        trade.orderStatus === "LIQUIDATE" ||
        trade.orderStatus === "FILLED"
    );
  }, [orderHistoryData]);

  const orderHistoryGroups = useMemo(() => {
    return buildOrderHistoryGroups(orderHistoryData);
  }, [orderHistoryData]);

  const filteredOrderHistoryGroups = useMemo(() => {
    const { side, status, type } = orderHistoryFilter;
    if (!side.size && !status.size && !type.size) return orderHistoryGroups;
    return orderHistoryGroups.filter((group) => {
      if (side.size && !side.has(group.parentSide)) return false;
      if (status.size && !status.has(group.lifecycleValue)) return false;
      if (type.size && !type.has(group.parentType)) return false;
      return true;
    });
  }, [orderHistoryGroups, orderHistoryFilter]);

  const filteredTraderHistoryData = useMemo(() => {
    const { side, status } = traderHistoryFilter;
    if (!side.size && !status.size) return traderHistoryData;
    return traderHistoryData.filter((trade) => {
      if (side.size && !side.has(trade.positionType)) return false;
      if (status.size && !status.has(trade.orderStatus)) return false;
      return true;
    });
  }, [traderHistoryData, traderHistoryFilter]);

  const { toast } = useToast();

  const queryClient = useQueryClient();

  const isSettlingOrder = useCallback(
    (uuid: string) => {
      return settlingOrders.has(uuid);
    },
    [settlingOrders]
  );

  const isCancellingOrder = useCallback(
    (uuid: string) => {
      return cancellingOrders.has(uuid);
    },
    [cancellingOrders]
  );

  const settleMarketOrder = useCallback(
    async (trade: TradeOrder, currentPrice: number) => {
      // Idempotency check: prevent duplicate settle attempts
      if (settlingOrders.has(trade.uuid)) {
        return;
      }

      // Mark order as settling
      setSettlingOrders((prev) => new Set(prev).add(trade.uuid));

      try {
        toast({
          title: "Closing position",
          description:
            "Please do not close this page while your position is being closed...",
        });

        const settleOrderResult = await settleOrder(
          trade,
          "market",
          privateKey,
          currentPrice
        );

        if (!settleOrderResult.success) {
          toast({
            title: "Failed to settle position",
            description: settleOrderResult.message,
            variant: "error",
          });
          return;
        }

        toast({
          title: "Order closed successfully",
          description:
            "Please do not close this page while your balance is being updated...",
        });

        const settledData = settleOrderResult.data;

        const updatedAccount = zkAccounts.find(
          (account) => account.address === trade.accountAddress
        );

        if (!updatedAccount) {
          // useSyncTrades may have already cleaned up this account before we
          // finished. If the trade is gone or already SETTLED, treat it as a
          // success rather than showing a false error.
          const currentTrade = tradeOrders.find((t) => t.uuid === trade.uuid);
          if (!currentTrade || currentTrade.orderStatus === "SETTLED") {
            toast({
              title: "Position closed",
              description: "Your position has been closed successfully.",
            });
            return;
          }

          toast({
            title: "Failed to settle position",
            description: "Failed to find account",
            variant: "error",
          });
          return;
        }

        await queryClient.invalidateQueries({ queryKey: ["sync-trades"] });

        toast({
          title: "Position closed",
          description: (
            <div className="opacity-90">
              Successfully closed {trade.orderType.toLowerCase()} order.{" "}
              {settledData.tx_hash && (
                <Link
                  href={`${process.env.NEXT_PUBLIC_EXPLORER_URL as string}/txs/${settledData.tx_hash}`}
                  target={"_blank"}
                  className="text-sm underline hover:opacity-100"
                >
                  Explorer link
                </Link>
              )}
            </div>
          ),
        });
      } finally {
        // Remove from settling set regardless of success/failure
        setSettlingOrders((prev) => {
          const next = new Set(prev);
          next.delete(trade.uuid);
          return next;
        });
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [privateKey, queryClient, settlingOrders, toast, tradeOrders, zkAccounts]
  );

  // Core cancel implementation — called directly or after confirmation.
  const executeCancelOrder = useCallback(
    async (
      order: TradeOrder,
      options?: { sl_bool?: boolean; tp_bool?: boolean }
    ) => {
      if (cancellingOrders.has(order.uuid)) return;

      setCancellingOrders((prev) => new Set(prev).add(order.uuid));

      // Derive SLTP mode from explicit cancel intent, not order contents.
      // A trade can contain both limit-close and SL/TP legs.
      const isSltpRequest =
        options?.sl_bool !== undefined || options?.tp_bool !== undefined;
      const cancelledSl = isSltpRequest ? (options?.sl_bool ?? false) : false;
      const cancelledTp = isSltpRequest ? (options?.tp_bool ?? false) : false;

      try {
        toast({
          title: "Cancelling order",
          description:
            "Please do not close this page while your order is being cancelled...",
        });

        const cancelOrderResult = await cancelZkOrder(
          order,
          privateKey,
          options
        );

        if (!cancelOrderResult.success) {
          toast({
            title: "Failed to cancel order",
            description: cancelOrderResult.message,
            variant: "error",
          });
          return;
        }

        const cancelOrderData = cancelOrderResult.data;

        if (isSltpRequest) {
          // SLTP cancel: position stays FILLED. Optimistically clear the
          // cancelled leg(s) in local state so the UI updates immediately.
          // useSyncTrades will reconcile on the next poll using the actual
          // API response (which may not yet include take_profit / stop_loss
          // fields — handled gracefully in cancelZkOrder).
          updateTrade({
            ...order,
            stopLoss: cancelledSl ? null : order.stopLoss,
            takeProfit: cancelledTp ? null : order.takeProfit,
          });

          // Record cancellation in order history
          addTradeHistory({
            ...order,
            orderStatus: "CANCELLED",
            orderType: "SLTP",
            stopLoss: cancelledSl ? order.stopLoss : null,
            takeProfit: cancelledTp ? order.takeProfit : null,
            date: new Date(),
          });
        } else {
          // Regular limit/entry cancel
          const zkAccount = zkAccounts.find(
            (account) => account.address === order.accountAddress
          );

          if (!zkAccount) {
            toast({
              title: "Failed to cancel order",
              description: "Failed to find account",
              variant: "error",
            });
            return;
          }

          addTradeHistory({
            ...order,
            entryPrice: order.settleLimit
              ? Number(order.settleLimit.price)
              : order.entryPrice,
            orderStatus: "CANCELLED",
            orderType: "LIMIT",
            date: new Date(),
          });

          updateZkAccount(order.accountAddress, {
            ...zkAccount,
            type: "Coin",
          });
        }

        await queryClient.invalidateQueries({ queryKey: ["sync-trades"] });

        toast({
          title: isSltpRequest ? "SLTP order cancelled" : "Order cancelled",
          description: (
            <div className="opacity-90">
              {isSltpRequest
                ? `Successfully cancelled ${cancelledSl && cancelledTp ? "Stop Loss and Take Profit" : cancelledSl ? "Stop Loss" : "Take Profit"}.`
                : "Successfully cancelled order."}{" "}
              {cancelOrderData.tx_hash && (
                <Link
                  href={`${process.env.NEXT_PUBLIC_EXPLORER_URL as string}/txs/${cancelOrderData.tx_hash}`}
                  target={"_blank"}
                  className="text-sm underline hover:opacity-100"
                >
                  Explorer link
                </Link>
              )}
            </div>
          ),
        });
      } finally {
        setCancellingOrders((prev) => {
          const next = new Set(prev);
          next.delete(order.uuid);
          return next;
        });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      addTradeHistory,
      cancellingOrders,
      privateKey,
      queryClient,
      toast,
      updateTrade,
      updateZkAccount,
      zkAccounts,
    ]
  );

  // Public cancel handler: when cancelling one SLTP leg and the other leg
  // still exists, show a confirmation dialog instead of cancelling directly.
  const cancelOrder = useCallback(
    async (
      order: TradeOrder,
      options?: { sl_bool?: boolean; tp_bool?: boolean }
    ) => {
      const cancellingOnlySl =
        options?.sl_bool === true && options?.tp_bool !== true;
      const cancellingOnlyTp =
        options?.tp_bool === true && options?.sl_bool !== true;

      if (cancellingOnlySl && order.takeProfit) {
        // Cancelling SL but TP still exists — ask the user
        setSltpCancelPending({ trade: order, cancelLeg: "sl" });
        return;
      }

      if (cancellingOnlyTp && order.stopLoss) {
        // Cancelling TP but SL still exists — ask the user
        setSltpCancelPending({ trade: order, cancelLeg: "tp" });
        return;
      }

      await executeCancelOrder(order, options);
    },
    [executeCancelOrder]
  );

  const openEditDialog = useCallback(
    (order: TradeOrder) => {
      if (editingOrders.has(order.uuid)) return;
      setEditDialogOrder(order);
      setIsEditDialogOpen(true);
    },
    [editingOrders]
  );

  const toggleOrderHistoryFilter = useCallback(
    (category: keyof OrderHistoryFilter, value: string) => {
      setOrderHistoryFilter((prev) => {
        const next = new Set(prev[category]);
        if (next.has(value)) next.delete(value);
        else next.add(value);
        return { ...prev, [category]: next };
      });
    },
    []
  );

  const toggleTraderHistoryFilter = useCallback(
    (category: keyof TraderHistoryFilter, value: string) => {
      setTraderHistoryFilter((prev) => {
        const next = new Set(prev[category]);
        if (next.has(value)) next.delete(value);
        else next.add(value);
        return { ...prev, [category]: next };
      });
    },
    []
  );

  const clearCurrentTabFilter = useCallback(() => {
    if (currentTab === "history") {
      setOrderHistoryFilter({
        side: new Set(),
        status: new Set(),
        type: new Set(),
      });
    } else if (currentTab === "trader-history") {
      setTraderHistoryFilter({ side: new Set(), status: new Set() });
    }
  }, [currentTab]);

  // Confirmation dialog: the "other leg" label and price for the prompt.
  const sltpConfirmOtherLabel = sltpCancelPending
    ? sltpCancelPending.cancelLeg === "sl"
      ? `Take Profit at ${formatCurrency(Number(sltpCancelPending.trade.takeProfit?.price ?? 0))}`
      : `Stop Loss at ${formatCurrency(Number(sltpCancelPending.trade.stopLoss?.price ?? 0))}`
    : "";

  const currentView =
    currentTab === "positions" ||
    currentTab === "open-orders" ||
    currentTab === "trader-history" ||
    currentTab === "history"
      ? width < COMPACT_TRADE_LAYOUT_THRESHOLD
        ? "cards"
        : viewByTab[currentTab]
      : "table";

  const isCompactTradeLayout = width < COMPACT_TRADE_LAYOUT_THRESHOLD;

  const hasOrderHistoryActiveFilter =
    orderHistoryFilter.side.size > 0 ||
    orderHistoryFilter.status.size > 0 ||
    orderHistoryFilter.type.size > 0;

  const hasTraderHistoryActiveFilter =
    traderHistoryFilter.side.size > 0 || traderHistoryFilter.status.size > 0;

  const hasActiveFilter =
    currentTab === "history"
      ? hasOrderHistoryActiveFilter
      : currentTab === "trader-history"
        ? hasTraderHistoryActiveFilter
        : false;

  const activeFilterCount =
    currentTab === "history"
      ? orderHistoryFilter.side.size +
        orderHistoryFilter.status.size +
        orderHistoryFilter.type.size
      : traderHistoryFilter.side.size + traderHistoryFilter.status.size;

  const currentGroup: ActivityGroup =
    currentTab === "positions" || currentTab === "open-orders"
      ? "live"
      : "history";

  const setActivityGroup = useCallback((group: ActivityGroup) => {
    if (group === "live") {
      setCurrentTab((prev) =>
        prev === "positions" || prev === "open-orders" ? prev : "positions"
      );
      return;
    }

    setCurrentTab((prev) =>
      prev === "trader-history" || prev === "history" ? prev : "history"
    );
  }, []);

  const activityTabs =
    currentGroup === "live"
      ? [
          {
            value: "positions" as const,
            label: `Positions${positionsData.length > 0 ? ` (${positionsData.length})` : ""}`,
          },
          {
            value: "open-orders" as const,
            label: `Open Orders${openOrdersRows.length > 0 ? ` (${openOrdersRows.length})` : ""}`,
          },
        ]
      : [
          { value: "trader-history" as const, label: "Trader History" },
          { value: "history" as const, label: "Order History" },
        ];

  return (
    <div className="flex w-full flex-col">
      <div className="flex w-full flex-col gap-1 border-b bg-background px-3 pt-1.5">
        <div className="flex flex-col gap-1 md:flex-row md:items-end md:justify-between md:gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setActivityGroup("live")}
                className={cn(
                  "min-h-[32px] rounded-md px-2.5 py-1 text-[13px] font-medium transition-colors md:min-h-[28px] md:px-2 md:py-0.5",
                  currentGroup === "live"
                    ? "bg-theme/10 text-primary"
                    : "text-primary/70 hover:bg-primary/5 hover:text-primary"
                )}
              >
                Live
              </button>
              <button
                type="button"
                onClick={() => setActivityGroup("history")}
                className={cn(
                  "min-h-[32px] rounded-md px-2.5 py-1 text-[13px] font-medium transition-colors md:min-h-[28px] md:px-2 md:py-0.5",
                  currentGroup === "history"
                    ? "bg-theme/10 text-primary"
                    : "text-primary/70 hover:bg-primary/5 hover:text-primary"
                )}
              >
                History
              </button>
            </div>
            <div className="scrollbar-none w-full touch-pan-x overflow-x-auto overflow-y-hidden overscroll-x-contain">
              <div className="inline-flex min-w-max items-center gap-0.5 border-b-0 pr-3">
                {activityTabs.map((tab) => (
                  <button
                    key={tab.value}
                    type="button"
                    onClick={() => setCurrentTab(tab.value)}
                    className={cn(
                      "min-h-[30px] shrink-0 border-b-2 px-1.5 py-1 text-[13px] font-medium transition-colors md:min-h-[28px] md:px-1.5 md:py-0.5",
                      currentTab === tab.value
                        ? "border-theme text-primary"
                        : "border-transparent text-primary/80 hover:text-primary"
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
                {/* Filter trigger — inline with tabs, mobile only */}
                {(currentTab === "history" ||
                  currentTab === "trader-history") && (
                  <>
                    <span className="bg-border/40 mx-1.5 h-3.5 w-px shrink-0 md:hidden" />
                    <button
                      type="button"
                      onClick={() => setFilterPanelOpen((prev) => !prev)}
                      className="flex min-h-[30px] items-center gap-1.5 rounded-md px-1.5 text-[12px] font-medium text-primary/60 transition-colors hover:text-primary/80 md:hidden"
                    >
                      <SlidersHorizontal className="h-3 w-3 shrink-0" />
                      <span>Filters</span>
                      {hasActiveFilter && (
                        <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-theme/20 px-1 text-[10px] font-semibold text-theme">
                          {activeFilterCount}
                        </span>
                      )}
                      {filterPanelOpen ? (
                        <ChevronUp className="h-3 w-3 shrink-0 text-primary/40" />
                      ) : (
                        <ChevronDown className="h-3 w-3 shrink-0 text-primary/40" />
                      )}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
          {(currentTab === "positions" ||
            currentTab === "open-orders" ||
            currentTab === "trader-history" ||
            currentTab === "history") &&
            !isCompactTradeLayout && (
              <div className="mb-1.5 flex shrink-0 items-end gap-1.5">
                {currentTab === "history" && currentView === "table" && (
                  <button
                    type="button"
                    aria-label="Configure columns"
                    title="Configure columns"
                    className="border-border bg-muted/20 hover:bg-muted/40 flex-shrink-0 self-end rounded-md border p-1.5 text-primary transition-colors duration-200 focus-visible:ring-1 focus-visible:ring-primary"
                    onClick={() => setOrderHistoryConfigOpen(true)}
                  >
                    <SlidersHorizontal className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  aria-label={
                    currentView === "table"
                      ? "Switch to cards view"
                      : "Switch to table view"
                  }
                  title={
                    currentView === "table"
                      ? "Switch to cards view"
                      : "Switch to table view"
                  }
                  className="border-border bg-muted/20 hover:bg-muted/40 flex-shrink-0 self-end rounded-md border p-1.5 text-primary transition-colors duration-200 focus-visible:ring-1 focus-visible:ring-primary"
                  onClick={() =>
                    setViewByTab((prev) => ({
                      ...prev,
                      [currentTab]: currentView === "table" ? "cards" : "table",
                    }))
                  }
                >
                  {currentView === "table" ? (
                    <LayoutGrid className="h-3.5 w-3.5" />
                  ) : (
                    <List className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            )}
        </div>

        {/* ── History filter bar ── */}
        {(currentTab === "history" || currentTab === "trader-history") && (
          <>
            {/* ── Mobile: collapsible filter panel (trigger lives in tab strip) ── */}
            <div className="md:hidden">
              {/* Expanded chip panel */}
              {filterPanelOpen && (
                <div className="space-y-2 pb-2.5 pt-1.5">
                  {/* Side */}
                  <div className="flex items-center gap-2">
                    <span className="text-primary/35 w-10 shrink-0 text-[10px] uppercase tracking-wide">
                      Side
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {FILTER_SIDE_CHIPS.map((chip) => {
                        const isActive = (
                          currentTab === "history"
                            ? orderHistoryFilter.side
                            : traderHistoryFilter.side
                        ).has(chip.value);
                        return (
                          <button
                            key={chip.value}
                            type="button"
                            onClick={() =>
                              currentTab === "history"
                                ? toggleOrderHistoryFilter("side", chip.value)
                                : toggleTraderHistoryFilter("side", chip.value)
                            }
                            className={cn(
                              "min-h-[32px] rounded-full border px-3 py-1 text-[12px] font-medium transition-colors",
                              isActive
                                ? chip.value === "LONG"
                                  ? "border-green-medium/50 bg-green-medium/10 text-green-medium"
                                  : "border-red/50 bg-red/10 text-red"
                                : "border-border/50 text-primary/55 active:bg-primary/5"
                            )}
                          >
                            {chip.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Status */}
                  <div className="flex items-center gap-2">
                    <span className="text-primary/35 w-10 shrink-0 text-[10px] uppercase tracking-wide">
                      Status
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {FILTER_STATUS_CHIPS.map((chip) => {
                        const isActive = (
                          currentTab === "history"
                            ? orderHistoryFilter.status
                            : traderHistoryFilter.status
                        ).has(chip.value);
                        return (
                          <button
                            key={chip.value}
                            type="button"
                            onClick={() =>
                              currentTab === "history"
                                ? toggleOrderHistoryFilter("status", chip.value)
                                : toggleTraderHistoryFilter(
                                    "status",
                                    chip.value
                                  )
                            }
                            className={cn(
                              "min-h-[32px] rounded-full border px-3 py-1 text-[12px] font-medium transition-colors",
                              isActive
                                ? "border-theme/50 bg-theme/10 text-theme"
                                : "border-border/50 text-primary/55 active:bg-primary/5"
                            )}
                          >
                            {chip.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Type — Order History only */}
                  {currentTab === "history" && (
                    <div className="flex items-center gap-2">
                      <span className="text-primary/35 w-10 shrink-0 text-[10px] uppercase tracking-wide">
                        Type
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {FILTER_TYPE_CHIPS.map((chip) => {
                          const isActive = orderHistoryFilter.type.has(
                            chip.value
                          );
                          return (
                            <button
                              key={chip.value}
                              type="button"
                              onClick={() =>
                                toggleOrderHistoryFilter("type", chip.value)
                              }
                              className={cn(
                                "min-h-[32px] rounded-full border px-3 py-1 text-[12px] font-medium transition-colors",
                                isActive
                                  ? "border-theme/50 bg-theme/10 text-theme"
                                  : "border-border/50 text-primary/55 active:bg-primary/5"
                              )}
                            >
                              {chip.label}
                            </button>
                          );
                        })}
                      </div>
                      {/* Footer: result count + clear */}
                      {hasActiveFilter && (
                        <div className="border-border/20 flex items-center justify-between border-t pt-2">
                          <span className="text-[11px] tabular-nums text-primary/40">
                            {currentTab === "history"
                              ? filteredOrderHistoryGroups.length
                              : filteredTraderHistoryData.length}{" "}
                            result
                            {(currentTab === "history"
                              ? filteredOrderHistoryGroups.length
                              : filteredTraderHistoryData.length) !== 1
                              ? "s"
                              : ""}
                          </span>
                          <button
                            type="button"
                            onClick={clearCurrentTabFilter}
                            className="min-h-[28px] rounded-full border border-primary/20 px-2.5 py-0.5 text-[11px] font-medium text-primary/50 transition-colors active:border-primary/40 active:text-primary/80"
                          >
                            Clear ×
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── Desktop: horizontal scrollable chip strip ── */}
            <div className="scrollbar-none hidden items-center gap-1.5 overflow-x-auto overflow-y-hidden overscroll-x-contain pb-1.5 pr-3 pt-1 md:flex">
              {/* Side chips */}
              {FILTER_SIDE_CHIPS.map((chip) => {
                const activeSet =
                  currentTab === "history"
                    ? orderHistoryFilter.side
                    : traderHistoryFilter.side;
                const isActive = activeSet.has(chip.value);
                return (
                  <button
                    key={chip.value}
                    type="button"
                    onClick={() =>
                      currentTab === "history"
                        ? toggleOrderHistoryFilter("side", chip.value)
                        : toggleTraderHistoryFilter("side", chip.value)
                    }
                    className={cn(
                      "shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors",
                      isActive
                        ? chip.value === "LONG"
                          ? "border-green-medium/50 bg-green-medium/10 text-green-medium"
                          : "border-red/50 bg-red/10 text-red"
                        : "border-border/50 text-primary/55 hover:border-border hover:text-primary/80"
                    )}
                  >
                    {chip.label}
                  </button>
                );
              })}

              <span className="shrink-0 text-primary/20">·</span>

              {/* Status chips */}
              {FILTER_STATUS_CHIPS.map((chip) => {
                const activeSet =
                  currentTab === "history"
                    ? orderHistoryFilter.status
                    : traderHistoryFilter.status;
                const isActive = activeSet.has(chip.value);
                return (
                  <button
                    key={chip.value}
                    type="button"
                    onClick={() =>
                      currentTab === "history"
                        ? toggleOrderHistoryFilter("status", chip.value)
                        : toggleTraderHistoryFilter("status", chip.value)
                    }
                    className={cn(
                      "shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors",
                      isActive
                        ? "border-theme/50 bg-theme/10 text-theme"
                        : "border-border/50 text-primary/55 hover:border-border hover:text-primary/80"
                    )}
                  >
                    {chip.label}
                  </button>
                );
              })}

              {/* Type chips — Order History only */}
              {currentTab === "history" && (
                <>
                  <span className="shrink-0 text-primary/20">·</span>
                  {FILTER_TYPE_CHIPS.map((chip) => {
                    const isActive = orderHistoryFilter.type.has(chip.value);
                    return (
                      <button
                        key={chip.value}
                        type="button"
                        onClick={() =>
                          toggleOrderHistoryFilter("type", chip.value)
                        }
                        className={cn(
                          "shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors",
                          isActive
                            ? "border-theme/50 bg-theme/10 text-theme"
                            : "border-border/50 text-primary/55 hover:border-border hover:text-primary/80"
                        )}
                      >
                        {chip.label}
                      </button>
                    );
                  })}
                </>
              )}

              {/* Result count + clear */}
              {hasActiveFilter && (
                <>
                  <span className="shrink-0 pl-0.5 text-primary/20">·</span>
                  <span className="shrink-0 text-[11px] tabular-nums text-primary/40">
                    {currentTab === "history"
                      ? filteredOrderHistoryGroups.length
                      : filteredTraderHistoryData.length}{" "}
                    result
                    {(currentTab === "history"
                      ? filteredOrderHistoryGroups.length
                      : filteredTraderHistoryData.length) === 1
                      ? ""
                      : "s"}
                  </span>
                  <button
                    type="button"
                    onClick={clearCurrentTabFilter}
                    className="shrink-0 rounded-full border border-primary/20 px-2.5 py-0.5 text-[11px] font-medium text-primary/50 transition-colors hover:border-primary/40 hover:text-primary/80"
                  >
                    Clear ×
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </div>
      <div className="flex-1">
        {currentTab === "positions" &&
          (currentView === "table" ? (
            <PositionsTable
              data={positionsData}
              settleMarketOrder={settleMarketOrder}
              isSettlingOrder={isSettlingOrder}
              cancelOrder={cancelOrder}
              isCancellingOrder={isCancellingOrder}
            />
          ) : (
            <PositionsCards
              data={positionsData}
              settleMarketOrder={settleMarketOrder}
              isSettlingOrder={isSettlingOrder}
              cancelOrder={cancelOrder}
              isCancellingOrder={isCancellingOrder}
            />
          ))}
        {currentTab === "open-orders" &&
          (currentView === "table" ? (
            <OpenOrdersTable
              data={openOrdersRows}
              cancelOrder={cancelOrder}
              openEditDialog={openEditDialog}
              isCancellingOrder={isCancellingOrder}
            />
          ) : (
            <OpenOrdersCards
              data={openOrdersRows}
              cancelOrder={cancelOrder}
              openEditDialog={openEditDialog}
              isCancellingOrder={isCancellingOrder}
            />
          ))}
        {currentTab === "trader-history" &&
          (currentView === "table" ? (
            <TraderHistoryTable data={filteredTraderHistoryData} />
          ) : (
            <TraderHistoryCards data={filteredTraderHistoryData} />
          ))}
        {currentTab === "history" &&
          (currentView === "table" ? (
            <OrderHistoryTable
              data={filteredOrderHistoryGroups}
              columnConfigOpen={orderHistoryConfigOpen}
              onColumnConfigOpenChange={setOrderHistoryConfigOpen}
            />
          ) : (
            <OrderHistoryCards data={filteredOrderHistoryGroups} />
          ))}
      </div>

      <EditOrderDialog
        order={editDialogOrder}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        editingOrders={editingOrders}
        setEditingOrders={setEditingOrders}
      />

      {/* Partial SLTP cancel confirmation dialog */}
      <Dialog
        open={!!sltpCancelPending}
        onOpenChange={(open) => {
          if (!open) setSltpCancelPending(null);
        }}
      >
        <DialogContent className="max-w-[calc(100vw-2rem)] md:max-w-lg">
          <DialogTitle>
            Cancel{" "}
            {sltpCancelPending?.cancelLeg === "sl"
              ? "Stop Loss"
              : "Take Profit"}
          </DialogTitle>
          <p className="min-w-0 break-words text-sm text-primary-accent">
            You also have a{" "}
            <span className="font-medium text-primary">
              {sltpConfirmOtherLabel}
            </span>{" "}
            active. Do you want to cancel it as well?
          </p>
          <div className="flex flex-col gap-2 pt-2 md:flex-row">
            <Button
              variant="ui"
              className="min-h-[44px] w-full md:min-h-0 md:w-auto"
              onClick={async () => {
                if (!sltpCancelPending) return;
                const { trade, cancelLeg } = sltpCancelPending;
                setSltpCancelPending(null);
                // Cancel both legs
                await executeCancelOrder(trade, {
                  sl_bool: true,
                  tp_bool: true,
                });
              }}
            >
              Yes, cancel both
            </Button>
            <Button
              variant="ui"
              className="min-h-[44px] w-full md:min-h-0 md:w-auto"
              onClick={async () => {
                if (!sltpCancelPending) return;
                const { trade, cancelLeg } = sltpCancelPending;
                setSltpCancelPending(null);
                // Cancel only the requested leg
                await executeCancelOrder(trade, {
                  sl_bool: cancelLeg === "sl",
                  tp_bool: cancelLeg === "tp",
                });
              }}
            >
              No, only cancel{" "}
              {sltpCancelPending?.cancelLeg === "sl" ? "SL" : "TP"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DetailsPanel;
