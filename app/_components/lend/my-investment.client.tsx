"use client";

import { Text } from "@/components/typography";
import Resource from "@/components/resource";
import Skeleton from "@/components/skeleton";
import { useTwilightStore } from "@/lib/providers/store";
import { calculateAPR } from "@/lib/helpers";

const MIN_HOLDING_SECONDS = 3600; // 1 hour - don't annualize before this
import { Tooltip } from "@/components/tooltip";
import cn from "@/lib/cn";
import BTC from "@/lib/twilight/denoms";
import Big from "big.js";
import dayjs from "dayjs";
import React, { useMemo } from "react";

const MyInvestment = () => {
  const lendOrders = useTwilightStore((state) => state.lend.lends);
  const lendHistory = useTwilightStore((state) => state.lend.lendHistory);
  const poolInfo = useTwilightStore((state) => state.lend.poolInfo);
  const poolShareValue = poolInfo?.pool_share ?? 0;

  const data = useMemo(() => {
    const lendedOrders = lendOrders.filter(
      (order) => order.orderStatus === "LENDED"
    );

    const activePrincipalSats = lendedOrders.reduce(
      (sum, order) => sum + order.value,
      0
    );

    const totalDepositsSats = lendHistory
      .filter((o) => o.orderStatus === "LENDED")
      .reduce((sum, order) => sum + order.value, 0);

    const realizedRewardsSats = lendHistory
      .filter((o) => o.orderStatus === "SETTLED")
      .reduce((sum, order) => sum + (order.payment || 0), 0);

    let pendingRewardsSats = 0;
    let annualizedReturn = 0;

    let showAnnualizedReturn = false;

    if (poolShareValue && lendedOrders.length > 0) {
      let weightedAPRSum = 0;
      let totalWeight = 0;

      for (const order of lendedOrders) {
        if (!order.npoolshare || !order.value) continue;

        const rewards =
          poolShareValue * (order.npoolshare / 10000) - order.value;
        if (rewards >= 100 || rewards < 0) {
          pendingRewardsSats += rewards;
        } else if (rewards > 0) {
          // dust filter: positive but < 100 sats => 0
        }

        const timeElapsed =
          (Date.now() - dayjs(order.timestamp).valueOf()) / 1000;
        const apr =
          timeElapsed >= MIN_HOLDING_SECONDS
            ? calculateAPR({
                rewards,
                principal: order.value,
                timeElapsedSeconds: timeElapsed,
              })
            : 0;
        if (timeElapsed >= MIN_HOLDING_SECONDS && Number.isFinite(apr)) {
          weightedAPRSum += apr * order.value;
          totalWeight += order.value;
          showAnnualizedReturn = true;
        }
      }

      if (totalWeight > 0) {
        annualizedReturn = weightedAPRSum / totalWeight;
      }
    }

    return {
      activePrincipalSats,
      totalDepositsSats,
      pendingRewardsSats,
      realizedRewardsSats,
      annualizedReturn,
      showAnnualizedReturn,
      hasActiveDeposits: activePrincipalSats > 0,
    };
  }, [lendOrders, lendHistory, poolShareValue]);

  const activePrincipalBTC = new BTC("sats", Big(data.activePrincipalSats)).convert("BTC");
  const totalDepositsBTC = new BTC("sats", Big(data.totalDepositsSats)).convert("BTC");
  const pendingRewardsBTC = new BTC("sats", Big(data.pendingRewardsSats)).convert("BTC");
  const realizedRewardsBTC = new BTC("sats", Big(data.realizedRewardsSats)).convert("BTC");

  return (
    <div className="space-y-4">
      <Text className="text-lg font-medium">My Investment</Text>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="flex flex-col gap-1">
          <Tooltip
            title="Active Principal"
            body="Your currently active deposited amount (open lend orders)."
          >
            <Text className="text-primary-accent">Active Principal</Text>
          </Tooltip>
          <Resource isLoaded placeholder={<Skeleton className="h-4 w-20" />}>
            <Text className="font-medium">
              {BTC.format(activePrincipalBTC, "BTC")} BTC
            </Text>
          </Resource>
        </div>
        <div className="flex flex-col gap-1">
          <Tooltip
            title="Total Deposits"
            body="Total amount you've deposited historically on this device/session. (Local history until exchange sync is added.)"
          >
            <Text className="text-primary-accent">Total Deposits</Text>
          </Tooltip>
          <Resource isLoaded placeholder={<Skeleton className="h-4 w-20" />}>
            <Text className="font-medium">
              {BTC.format(totalDepositsBTC, "BTC")} BTC
            </Text>
          </Resource>
        </div>
        <div className="flex flex-col gap-1">
          <Tooltip
            title="Pending Rewards"
            body="Your unrealized profit/loss on active deposits based on current Share NAV. Updates with Share NAV and may be negative."
          >
            <Text className="text-primary-accent">Pending Rewards</Text>
          </Tooltip>
          <Resource isLoaded placeholder={<Skeleton className="h-4 w-20" />}>
            <Text
              className={cn(
                "font-medium",
                Number(pendingRewardsBTC) > 0 && "text-green-medium",
                Number(pendingRewardsBTC) < 0 && "text-red"
              )}
            >
              {BTC.format(pendingRewardsBTC, "BTC")} BTC
            </Text>
          </Resource>
        </div>
        <div className="flex flex-col gap-1">
          <Tooltip
            title="Realized Rewards"
            body="Rewards realized and paid out on completed withdrawals (settled orders)."
          >
            <Text className="text-primary-accent">Realized Rewards</Text>
          </Tooltip>
          <Resource isLoaded placeholder={<Skeleton className="h-4 w-20" />}>
            <Text
              className={cn(
                "font-medium",
                Number(realizedRewardsBTC) > 0 && "text-green-medium"
              )}
            >
              {BTC.format(realizedRewardsBTC, "BTC")} BTC
            </Text>
          </Resource>
        </div>
        <div className="col-span-2 flex flex-col gap-1">
          <Tooltip
            title="Annualized Return (est.)"
            body="An annualized estimate based on your current unrealized rewards and time since deposit. This can change as Share NAV changes. For stability, annualization assumes a minimum 7-day holding period."
          >
            <Text className="text-primary-accent">
              Annualized Return (est.)
            </Text>
          </Tooltip>
          <Resource isLoaded placeholder={<Skeleton className="h-4 w-16" />}>
            <Text
              className={cn(
                "font-medium",
                data.annualizedReturn > 0 && "text-green-medium",
                data.annualizedReturn < 0 && "text-red"
              )}
            >
              {data.hasActiveDeposits &&
              data.showAnnualizedReturn &&
              Number.isFinite(data.annualizedReturn)
                ? `${data.annualizedReturn.toFixed(2)}%`
                : "—"}
            </Text>
          </Resource>
        </div>
      </div>
    </div>
  );
};

export default MyInvestment;
