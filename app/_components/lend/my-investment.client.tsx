"use client";

import { Text } from "@/components/typography";
import Resource from "@/components/resource";
import Skeleton from "@/components/skeleton";
import { useTwilightStore } from "@/lib/providers/store";
import { calculateAPR, formatSatsCompact } from "@/lib/helpers";
import { computeLendingMarkToValue } from "@/lib/lend/lend-mark-to-value";
import { POOL_SHARE_DECIMALS_SCALE } from "@/lib/format/poolShares";

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
    const { activePrincipalSats, pendingRewardsSats } =
      computeLendingMarkToValue(lendOrders, poolShareValue);

    const lendedOrders = lendOrders.filter(
      (order) => order.orderStatus === "LENDED"
    );

    const totalDepositsSats = lendHistory
      .filter((o) => o.orderStatus === "LENDED")
      .reduce((sum, order) => sum + order.value, 0);

    const realizedRewardsSats = lendHistory
      .filter((o) => o.orderStatus === "SETTLED")
      .reduce((sum, order) => sum + (order.payment || 0), 0);

    let annualizedReturn = 0;
    let showAnnualizedReturn = false;

    if (poolShareValue && lendedOrders.length > 0) {
      let weightedAPRSum = 0;
      let totalWeight = 0;

      for (const order of lendedOrders) {
        if (!order.npoolshare || !order.value) continue;

        const rewards =
          poolShareValue * (order.npoolshare / POOL_SHARE_DECIMALS_SCALE) -
          order.value;

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

  const activePrincipalBTC = new BTC(
    "sats",
    Big(data.activePrincipalSats)
  ).convert("BTC");
  const totalDepositsBTC = new BTC("sats", Big(data.totalDepositsSats)).convert(
    "BTC"
  );

  const realizedRewardsBTC = new BTC(
    "sats",
    Big(data.realizedRewardsSats)
  ).convert("BTC");

  const totalDepositsStat = (
    <div className="flex flex-col gap-1">
      <Tooltip
        title="Total Deposits"
        body="Total amount you've deposited historically on this device/session. (Local history until exchange sync is added.)"
      >
        <Text className="text-xs text-primary-accent/60">Total Deposits</Text>
      </Tooltip>
      <Resource isLoaded placeholder={<Skeleton className="h-4 w-20" />}>
        <Text className="text-sm text-primary/60">
          {BTC.format(totalDepositsBTC, "BTC")} BTC
        </Text>
      </Resource>
    </div>
  );

  const realizedRewardsStat = (
    <div className="flex flex-col gap-1">
      <Tooltip
        title="Realized Rewards"
        body="Rewards realized and paid out on completed withdrawals (settled orders)."
      >
        <Text className="text-xs text-primary-accent/60">Realized Rewards</Text>
      </Tooltip>
      <Resource isLoaded placeholder={<Skeleton className="h-4 w-20" />}>
        <Text
          className={cn(
            "text-sm text-primary/60",
            Number(realizedRewardsBTC) > 0 && "text-green-medium/70"
          )}
        >
          {BTC.format(realizedRewardsBTC, "BTC")} BTC
        </Text>
      </Resource>
    </div>
  );

  return (
    <div className="space-y-3 md:space-y-4">
      <Text className="text-sm font-medium text-primary/70">My Investment</Text>

      <div className="grid grid-cols-2 gap-x-3 gap-y-3 text-sm md:gap-x-4 md:gap-y-4">
        {/* Primary: Active Principal — full-width, dominant */}
        <div className="col-span-2 flex flex-col gap-1">
          <Tooltip
            title="Active Principal"
            body="Your currently active deposited amount (open lend orders)."
          >
            <Text className="text-sm text-primary-accent">
              Active Principal
            </Text>
          </Tooltip>
          <Resource isLoaded placeholder={<Skeleton className="h-6 w-28" />}>
            <Text className="text-lg font-semibold">
              {BTC.format(activePrincipalBTC, "BTC")} BTC
            </Text>
          </Resource>
        </div>

        {/* Secondary: Pending Rewards + Annualized Return */}
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
                data.pendingRewardsSats > 0 && "text-green-medium",
                data.pendingRewardsSats < 0 && "text-red"
              )}
            >
              {formatSatsCompact(data.pendingRewardsSats)}
            </Text>
          </Resource>
        </div>
        <div className="flex flex-col gap-1">
          <Tooltip
            title="Annualized Return (est.)"
            body="An annualized estimate based on your current unrealized rewards and time since deposit. This can change as Share NAV changes. For stability, annualization assumes a minimum 7-day holding period."
          >
            <Text className="text-primary-accent">Ann. Return (est.)</Text>
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

        <div className="flex flex-col gap-1">{totalDepositsStat}</div>
        <div className="flex flex-col gap-1">{realizedRewardsStat}</div>
      </div>
    </div>
  );
};

export default MyInvestment;
