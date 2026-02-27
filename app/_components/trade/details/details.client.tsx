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

type TabType =
  | "history"
  | "trades"
  | "positions"
  | "open-orders"
  | "trader-history";

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

  const positionsData = useMemo(() => {
    return tradeOrders.filter((trade) => trade.orderStatus === "FILLED");
  }, [tradeOrders]);

  const openOrdersData = useMemo(() => {
    return tradeOrders.filter(
      (trade) =>
        trade.orderStatus !== "SETTLED" &&
        trade.orderStatus !== "CANCELLED" &&
        (trade.orderStatus === "PENDING" ||
          trade.settleLimit ||
          trade.takeProfit ||
          trade.stopLoss)
    );
  }, [tradeOrders]);

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
          // finished.  If the trade is gone or already SETTLED, treat it as a
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
    [privateKey, zkAccounts, toast, settlingOrders]
  );

  const cancelOrder = useCallback(
    async (
      order: TradeOrder,
      options?: { sl_bool?: boolean; tp_bool?: boolean }
    ) => {
      if (cancellingOrders.has(order.uuid)) return;

      setCancellingOrders((prev) => new Set(prev).add(order.uuid));

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

        // const result = await cleanupTradeOrder(privateKey, zkAccount);

        // if (!result.success) {
        //   toast({
        //     title: "Error with settling trade order",
        //     description: result.message,
        //     variant: "error",
        //   })
        //   return;
        // }

        toast({
          title: "Order cancelled",
          description: (
            <div className="opacity-90">
              Successfully cancelled limit order.{" "}
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

        const updatedAccount = zkAccounts.find(
          (account) => account.address === order.accountAddress
        );

        if (!updatedAccount) {
          toast({
            title: "Failed to cancel order",
            description: "Failed to find account",
            variant: "error",
          });
          return;
        }

        // addTradeHistory({
        //   ...order,
        //   orderStatus: cancelOrderData.order_status,
        //   availableMargin: Big(cancelOrderData.available_margin).toNumber(),
        //   maintenanceMargin: Big(cancelOrderData.maintenance_margin).toNumber(),
        //   unrealizedPnl: Big(cancelOrderData.unrealized_pnl).toNumber(),
        //   settlementPrice: Big(cancelOrderData.settlement_price).toNumber(),
        //   positionSize: Big(cancelOrderData.positionsize).toNumber(),
        //   orderType: cancelOrderData.order_type,
        //   date: dayjs(cancelOrderData.timestamp).toDate(),
        //   exit_nonce: cancelOrderData.exit_nonce,
        //   executionPrice: Big(cancelOrderData.execution_price).toNumber(),
        //   isOpen: false,
        //   feeSettled: Big(cancelOrderData.fee_settled).toNumber(),
        //   feeFilled: Big(cancelOrderData.fee_filled).toNumber(),
        //   realizedPnl: Big(cancelOrderData.unrealized_pnl).toNumber(),
        //   tx_hash: cancelOrderData.tx_hash || order.tx_hash,
        // })

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
          ...updatedAccount,
          type: "Coin",
        });

        await queryClient.invalidateQueries({ queryKey: ["sync-trades"] });
      } finally {
        setCancellingOrders((prev) => {
          const next = new Set(prev);
          next.delete(order.uuid);
          return next;
        });
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [privateKey, zkAccounts, cancellingOrders]
  );

  const openEditDialog = useCallback(
    (order: TradeOrder) => {
      if (editingOrders.has(order.uuid)) return;
      setEditDialogOrder(order);
      setIsEditDialogOpen(true);
    },
    [editingOrders]
  );

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
            data={openOrdersData}
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
    </div>
  );
};

export default DetailsPanel;
