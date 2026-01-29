"use client";

import { Text } from "@/components/typography";
import Resource from "@/components/resource";
import Skeleton from "@/components/skeleton";
import { useTwilightStore } from "@/lib/providers/store";
import { useSessionStore } from "@/lib/providers/session";
import BTC from "@/lib/twilight/denoms";
import Big from "big.js";
import React, { useMemo } from "react";

const MyInvestment = () => {
  const lendOrders = useTwilightStore((state) => state.lend.lends);
  const currentPrice = useSessionStore((state) => state.price.btcPrice);

  const investmentData = useMemo(() => {
    // Calculate total deposits (sum of all LENDED orders)
    const totalDepositsSats = lendOrders
      .filter(order => order.orderStatus === "LENDED")
      .reduce((sum, order) => sum + order.value, 0);

    // Calculate rewards earned (sum of all SETTLED order payments minus withdrawals)
    const totalRewardsSats = lendOrders
      .filter(order => order.orderStatus === "SETTLED")
      .reduce((sum, order) => sum + (order.payment || 0), 0);

    // Calculate personal APR
    let personalAPR = 0;
    if (totalDepositsSats > 0) {
      personalAPR = (totalRewardsSats / totalDepositsSats) * 100;
      // Annualize based on time period (this is a simplified calculation)
      // In reality, you'd need to consider the time periods of each order
    }

    return {
      totalDepositsSats,
      totalRewardsSats,
      personalAPR
    };
  }, [lendOrders]);

  const totalDepositsBTC = new BTC("sats", Big(investmentData.totalDepositsSats)).convert("BTC");
  const totalRewardsBTC = new BTC("sats", Big(investmentData.totalRewardsSats)).convert("BTC");

  return (
    <div className="space-y-4">
      <Text className="text-lg font-medium">My Investment</Text>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="flex justify-between">
          <Text className="text-primary-accent">Total Deposits</Text>
          <Resource
            isLoaded={true}
            placeholder={<Skeleton className="h-4 w-20" />}
          >
            <Text className="font-medium">
              {`${BTC.format(totalDepositsBTC, "BTC")} BTC`}
            </Text>
          </Resource>
        </div>

        <div className="flex justify-between">
          <Text className="text-primary-accent">Rewards Earned</Text>
          <Resource
            isLoaded={true}
            placeholder={<Skeleton className="h-4 w-20" />}
          >
            <Text className="font-medium text-green-medium">
              {BTC.format(totalRewardsBTC, "BTC")}
            </Text>
          </Resource>
        </div>

        <div className="flex justify-between">
          <Text className="text-primary-accent">APR</Text>
          <Resource
            isLoaded={true}
            placeholder={<Skeleton className="h-4 w-16" />}
          >
            <Text className="font-medium">
              {investmentData.personalAPR.toFixed(2)}%
            </Text>
          </Resource>
        </div>
      </div>
    </div>
  );
};

export default MyInvestment; 