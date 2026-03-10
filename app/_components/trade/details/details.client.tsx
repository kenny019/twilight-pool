"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/tabs";
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
import { useWallet } from "@cosmos-kit/react-lite";
import { useQueryClient } from "@tanstack/react-query";
import EditOrderDialog from "@/components/edit-order-dialog";
import { Dialog, DialogContent, DialogTitle } from "@/components/dialog";
import Button from "@/components/button";
import { formatCurrency } from "@/lib/twilight/ticker";

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

// State for the "cancel one SLTP leg — ask about the other?" confirmation.
type SltpCancelPending = {
  trade: TradeOrder;
  cancelLeg: "sl" | "tp";
};

const DetailsPanel = () => {
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

      const isSltp = !!(order.takeProfit || order.stopLoss);
      const cancelledSl = isSltp && (options?.sl_bool ?? !!order.stopLoss);
      const cancelledTp = isSltp && (options?.tp_bool ?? !!order.takeProfit);

      try {
        toast({
          title: "Cancelling order",
          description:
            "Please do not close this page while your order is being cancelled...",
        });

        const cancelOrderResult = await cancelZkOrder(order, privateKey, options);

        if (!cancelOrderResult.success) {
          toast({
            title: "Failed to cancel order",
            description: cancelOrderResult.message,
            variant: "error",
          });
          return;
        }

        const cancelOrderData = cancelOrderResult.data;

        if (isSltp) {
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
          title: isSltp ? "SLTP order cancelled" : "Order cancelled",
          description: (
            <div className="opacity-90">
              {isSltp
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

  // Confirmation dialog: the "other leg" label and price for the prompt.
  const sltpConfirmOtherLabel = sltpCancelPending
    ? sltpCancelPending.cancelLeg === "sl"
      ? `Take Profit at ${formatCurrency(Number(sltpCancelPending.trade.takeProfit?.price ?? 0))}`
      : `Stop Loss at ${formatCurrency(Number(sltpCancelPending.trade.stopLoss?.price ?? 0))}`
    : "";

  return (
    <div className="flex h-full w-full flex-col">
      <div className="sticky top-0 z-10 flex w-full items-center border-b bg-background pl-3 pt-2">
        <Tabs defaultValue={currentTab}>
          <TabsList className="flex w-full border-b-0" variant="underline">
            <TabsTrigger
              onClick={() => setCurrentTab("positions")}
              value={"positions"}
              variant="underline"
            >
              Positions
            </TabsTrigger>
            <TabsTrigger
              onClick={() => setCurrentTab("open-orders")}
              value={"open-orders"}
              variant="underline"
            >
              Open Orders
            </TabsTrigger>
            <TabsTrigger
              onClick={() => setCurrentTab("trader-history")}
              value={"trader-history"}
              variant="underline"
            >
              Trader History
            </TabsTrigger>
            <TabsTrigger
              onClick={() => setCurrentTab("history")}
              value={"history"}
              variant="underline"
            >
              Order History
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <div className="">
        {currentTab === "positions" && (
          <PositionsTable
            data={positionsData}
            settleMarketOrder={settleMarketOrder}
            isSettlingOrder={isSettlingOrder}
          />
        )}
        {currentTab === "open-orders" && (
          <OpenOrdersTable
            data={openOrdersRows}
            cancelOrder={cancelOrder}
            openEditDialog={openEditDialog}
            isCancellingOrder={isCancellingOrder}
          />
        )}
        {currentTab === "trader-history" && (
          <TraderHistoryTable data={traderHistoryData} />
        )}
        {currentTab === "history" && (
          <OrderHistoryTable data={orderHistoryData} />
        )}
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
        <DialogContent>
          <DialogTitle>
            Cancel{" "}
            {sltpCancelPending?.cancelLeg === "sl" ? "Stop Loss" : "Take Profit"}
          </DialogTitle>
          <p className="text-sm text-primary-accent">
            You also have a{" "}
            <span className="font-medium text-primary">
              {sltpConfirmOtherLabel}
            </span>{" "}
            active. Do you want to cancel it as well?
          </p>
          <div className="flex gap-2 pt-2">
            <Button
              variant="ui"
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
