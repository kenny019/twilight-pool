"use client";

import { Text } from "@/components/typography";
import Resource from "@/components/resource";
import Skeleton from "@/components/skeleton";
import { useTwilightStore } from "@/lib/providers/store";
import { useGetPoolShareValue } from "@/lib/hooks/useGetPoolShareValue";
import { calculateAPR } from "@/lib/helpers";
import cn from "@/lib/cn";
import BTC from "@/lib/twilight/denoms";
import Big from "big.js";
import dayjs from "dayjs";
import React, { useMemo } from "react";

const MyInvestment = () => {
  const lendOrders = useTwilightStore((state) => state.lend.lends);
  const lendHistory = useTwilightStore((state) => state.lend.lendHistory);
  const { data: poolShareValue } = useGetPoolShareValue();

  const investmentData = useMemo(() => {
    const lendedOrders = lendOrders.filter(
      (order) => order.orderStatus === "LENDED"
    );

    // Total deposits from active LENDED orders
    const totalDepositsSats = lendedOrders.reduce(
      (sum, order) => sum + order.value,
      0
    );

    // Rewards from settled orders (settled orders live in lendHistory)
    const totalRewardsSats = lendHistory.reduce(
      (sum, order) => sum + (order.payment || 0),
      0
    );

    // Dynamic APR + pending rewards from active orders using pool share price
    let personalAPR = 0;
    let pendingRewardsSats = 0;
    if (poolShareValue && totalDepositsSats > 0) {
      let weightedAPRSum = 0;
      let totalWeight = 0;

      for (const order of lendedOrders) {
        if (!order.npoolshare || !order.value) continue;

        const rewards =
          poolShareValue * (order.npoolshare / 10000) - order.value;
        if (rewards >= 100) pendingRewardsSats += rewards;

        const timeElapsed =
          (Date.now() - dayjs(order.timestamp).valueOf()) / 1000;

        const apr = calculateAPR({
          rewards,
          principal: order.value,
          timeElapsedSeconds: timeElapsed,
        });

        weightedAPRSum += apr * order.value;
        totalWeight += order.value;
      }

      if (totalWeight > 0) {
        personalAPR = weightedAPRSum / totalWeight;
      }
    }

    return {
      totalDepositsSats,
      totalRewardsSats,
      personalAPR,
      pendingRewardsSats,
    };
  }, [lendOrders, lendHistory, poolShareValue]);

  const totalDepositsBTC = new BTC(
    "sats",
    Big(investmentData.totalDepositsSats)
  ).convert("BTC");
  const totalRewardsBTC = new BTC(
    "sats",
    Big(investmentData.totalRewardsSats)
  ).convert("BTC");
  const pendingRewardsBTC = new BTC(
    "sats",
    Big(investmentData.pendingRewardsSats)
  ).convert("BTC");

  return (
    <div className="space-y-4">
      <Text className="text-lg font-medium">My Investment</Text>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="flex justify-between">
          <Text className="text-primary-accent">Total Deposits (BTC)</Text>
          <Resource
            isLoaded={true}
            placeholder={<Skeleton className="h-4 w-20" />}
          >
            <Text className="font-medium">
              {BTC.format(totalDepositsBTC, "BTC")}
            </Text>
          </Resource>
        </div>

        <div className="flex justify-between">
          <Text className="text-primary-accent">Rewards Earned (BTC)</Text>
          <Resource
            isLoaded={true}
            placeholder={<Skeleton className="h-4 w-20" />}
          >
            <Text className={cn("font-medium", Number(totalRewardsBTC) > 0 && "text-green-medium")}>
              {Number(totalRewardsBTC).toFixed(8)}
            </Text>
          </Resource>
        </div>

        <div className="flex justify-between">
          <Text className="text-primary-accent">APR</Text>
          <Resource
            isLoaded={true}
            placeholder={<Skeleton className="h-4 w-16" />}
          >
            <Text
              className={cn(
                "font-medium",
                investmentData.personalAPR > 0 && "text-green-medium"
              )}
            >
              {investmentData.personalAPR.toFixed(2)}%
            </Text>
          </Resource>
        </div>

        <div className="flex justify-between">
          <Text className="text-primary-accent">Pending Rewards (BTC)</Text>
          <Resource
            isLoaded={true}
            placeholder={<Skeleton className="h-4 w-20" />}
          >
            <Text className={cn("font-medium", Number(pendingRewardsBTC) > 0 && "text-green-medium")}>
              {Number(pendingRewardsBTC).toFixed(8)}
            </Text>
          </Resource>
        </div>
      </div>
    </div>
  );
};

export default MyInvestment;
