"use client";

import PoolInfo from "@/app/_components/lend/pool-info.client";
import PoolHealth from "@/app/_components/lend/pool-health.client";
import ApyChart from "@/app/_components/lend/apy-chart.client";
import MyInvestment from "@/app/_components/lend/my-investment.client";
import LendManagement from "@/app/_components/lend/lend-management.client";
import LendOrdersTable from "@/app/_components/trade/details/tables/lend-orders/lend-orders-table.client";
import LendHistoryTable from "@/app/_components/trade/details/tables/lend-history/lend-history-table.client";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/tabs";
import { Text } from "@/components/typography";
import { Separator } from "@/components/seperator";
import useGetMarketStats from "@/lib/hooks/useGetMarketStats";
import useRedirectUnconnected from "@/lib/hooks/useRedirectUnconnected";
import { useToast } from "@/lib/hooks/useToast";
import { useLendWithdrawal } from "@/lib/hooks/useLendWithdrawal";
import { useTwilightStore } from "@/lib/providers/store";
import { Loader2 } from "lucide-react";
import React, { useState, useMemo, useCallback, useEffect } from "react";
import { useGetLendPoolInfo } from "@/lib/hooks/useGetLendPoolInfo";
import type { ApyPeriod } from "@/lib/hooks/useApyChartData";
import { usePriceFeed } from "@/lib/providers/feed";

const formatTag = (tag: string) => {
  if (tag === "main") {
    return "Primary Trading Account";
  }

  return tag;
};

type TabType = "active-orders" | "lend-history";

const Page = () => {
  useRedirectUnconnected();
  useGetLendPoolInfo();

  const { toast } = useToast();
  const marketStats = useGetMarketStats();
  const isRelayerHalted = marketStats.data?.status === "HALT";

  const [currentTab, setCurrentTab] = useState<TabType>("active-orders");
  const [selectedApyPeriod, setSelectedApyPeriod] = useState<ApyPeriod>("1W");

  const { getCurrentPrice } = usePriceFeed();
  const lendOrders = useTwilightStore((state) => state.lend.lends);
  const lendHistoryData = useTwilightStore((state) => state.lend.lendHistory);
  const poolInfo = useTwilightStore((state) => state.lend.poolInfo);
  const zKAccounts = useTwilightStore((state) => state.zk.zkAccounts);
  const removeLend = useTwilightStore((state) => state.lend.removeLend);

  const zkAccountTagMap = useMemo(
    () => new Map(zKAccounts.map((a) => [a.address, a.tag])),
    [zKAccounts]
  );

  const getAccountTag = useCallback(
    (address: string) => {
      return formatTag(zkAccountTagMap.get(address) || "");
    },
    [zkAccountTagMap]
  );

  // Filter lend orders for active vs history
  const activeLendOrders = useMemo(() => {
    return lendOrders
      .filter((order) => order.orderStatus === "LENDED")
      .map((order) => ({
        ...order,
        accountTag: getAccountTag(order.accountAddress),
      }));
  }, [lendOrders, getAccountTag]);

  const lendHistory = useMemo(() => {
    return lendHistoryData.map((order) => ({
      ...order,
      accountTag: getAccountTag(order.accountAddress),
    }));
  }, [lendHistoryData, getAccountTag]);

  // Self-heal stale persisted UI state from older versions:
  // if an order is already settled/cancelled in history, remove it from active lends.
  useEffect(() => {
    const closedIds = new Set(
      lendHistoryData
        .filter(
          (order) =>
            order.orderStatus === "SETTLED" || order.orderStatus === "CANCELLED"
        )
        .flatMap((order) =>
          [order.uuid, order.request_id].filter(
            (id): id is string => typeof id === "string" && !!id
          )
        )
    );

    lendOrders
      .filter(
        (order) =>
          order.withdrawPending &&
          (closedIds.has(order.uuid) ||
            (typeof order.request_id === "string" &&
              closedIds.has(order.request_id)))
      )
      .forEach((order) => removeLend(order));
  }, [lendOrders, lendHistoryData, removeLend]);

  const getPoolSharePrice = () => poolInfo?.pool_share || 0;

  const {
    isWithdrawDialogOpen,
    setIsWithdrawDialogOpen,
    settleLendOrder,
    settlingOrderId,
  } = useLendWithdrawal({
    isRelayerHalted,
    getAccountTag,
    toast,
  });

  function renderTableContent() {
    switch (currentTab) {
      case "active-orders":
        return (
          <LendOrdersTable
            data={activeLendOrders}
            getCurrentPrice={getCurrentPrice}
            getPoolSharePrice={getPoolSharePrice}
            settleLendOrder={settleLendOrder}
            settlingOrderId={settlingOrderId}
            isRelayerHalted={isRelayerHalted}
          />
        );
      case "lend-history":
        return (
          <LendHistoryTable
            data={lendHistory}
            getCurrentPrice={getCurrentPrice}
          />
        );
    }
  }

  return (
    <div className="mx-4 my-8 space-y-5 md:mx-8 md:space-y-6">
      <Dialog
        open={isWithdrawDialogOpen}
        onOpenChange={setIsWithdrawDialogOpen}
      >
        <DialogContent>
          <div className="flex flex-col items-center gap-4 py-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <DialogTitle>Withdrawal In Progress</DialogTitle>
            <DialogDescription className="text-center">
              A wallet signature is required to complete your withdrawal. Please
              approve the transaction when prompted.
            </DialogDescription>
          </div>
        </DialogContent>
      </Dialog>
      {/*
        Mobile / Tablet (< lg): single column in approved hierarchy order.
        Desktop (lg+): 12-column grid.
          Row 1 — Pool Performance (5) | Add Liquidity (3) | My Investment (4)
          Row 2 — APY Trend (8) | Pool Health (4, self-start)
      */}

      {/* Mobile / Tablet — single column stack */}
      <div className="flex flex-col gap-4 lg:hidden">
        <div className="bg-card rounded-lg border border-outline p-4">
          <Text className="mb-3 text-base font-medium">Pool Performance</Text>
          <PoolInfo selectedApyPeriod={selectedApyPeriod} />
        </div>
        <div className="bg-card rounded-lg border border-outline p-4">
          <Text className="mb-3 text-base font-medium">APY Trend</Text>
          <ApyChart selectedPeriod={selectedApyPeriod} onPeriodChange={setSelectedApyPeriod} />
        </div>
        <div className="bg-card rounded-lg border border-outline p-4">
          <MyInvestment />
        </div>
        <div className="bg-card rounded-lg border border-outline p-4">
          <Text className="mb-3 text-base font-medium">Add Liquidity</Text>
          <div className="space-y-3">
            <LendManagement />
            <p className="text-xs text-primary-accent/50">
              Earn yield from trading fees and lending.
            </p>
          </div>
        </div>
        <div className="bg-card rounded-lg border border-outline p-4">
          <Text className="mb-3 text-base font-medium">Pool Health</Text>
          <PoolHealth />
        </div>
      </div>

      {/* Desktop (lg+) — action rail layout
          Left  (8): Pool Performance → APY Chart
          Right (4): Add Liquidity → My Investment → Pool Health
      */}
      <div className="hidden lg:flex lg:gap-5">

        {/* Left column — metrics + chart */}
        <div className="flex min-w-0 flex-1 flex-col gap-5">
          <div className="bg-card rounded-lg border border-outline p-4">
            <Text className="mb-3 text-base font-medium">Pool Performance</Text>
            <PoolInfo selectedApyPeriod={selectedApyPeriod} />
          </div>
          <div className="bg-card flex flex-1 flex-col rounded-lg border border-outline p-5">
            <Text className="mb-3 shrink-0 text-base font-medium">APY Trend</Text>
            <div className="flex-1 min-h-[280px]">
              <ApyChart selectedPeriod={selectedApyPeriod} onPeriodChange={setSelectedApyPeriod} />
            </div>
          </div>
        </div>

        {/* Right column — action rail with intentional hierarchy */}
        <div className="flex w-[460px] shrink-0 flex-col gap-5">

          {/* Add Liquidity — primary: full padding, full border weight */}
          <div className="bg-card rounded-lg border border-outline p-5">
            <Text className="mb-4 text-base font-medium">Add Liquidity</Text>
            <div className="space-y-3">
            <LendManagement />
            <p className="text-xs text-primary-accent/50">
              Earn yield from trading fees and lending.
            </p>
          </div>
        </div>

          {/* My Investment — secondary: slightly tighter, border de-emphasized */}
          <div className="bg-card rounded-lg border border-outline/70 p-4">
            <MyInvestment />
          </div>

          {/* Pool Health — supporting: most compact, most muted border */}
          <div className="bg-card rounded-lg border border-outline/40 p-4">
            <Text className="mb-3 text-sm font-medium text-primary/60">Pool Health</Text>
            <PoolHealth />
          </div>

        </div>

      </div>

      <Separator />

      {/* Positions / History tabs */}
      <div className="space-y-3">
        <div className="flex w-full items-center border-b">
          <Tabs defaultValue={currentTab}>
            <TabsList className="flex w-full border-b-0" variant="underline">
              <TabsTrigger
                onClick={() => setCurrentTab("active-orders")}
                value="active-orders"
                variant="underline"
              >
                Positions
              </TabsTrigger>
              <TabsTrigger
                onClick={() => setCurrentTab("lend-history")}
                value="lend-history"
                variant="underline"
              >
                History
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div>{renderTableContent()}</div>
      </div>
    </div>
  );
};

export default Page;
