"use client";

import { Text } from "@/components/typography";
import Resource from "@/components/resource";
import Skeleton from "@/components/skeleton";
import { useTwilightStore } from "@/lib/providers/store";
import { useSessionStore } from "@/lib/providers/session";
import React, { useMemo } from "react";
import { useGetPoolShareValue } from '@/lib/hooks/useGetPoolShareValue';
import { useApyChartData, APY_PERIOD_PARAMS, ApyPeriod } from "@/lib/hooks/useApyChartData";

const APY_LABELS: Record<ApyPeriod, string> = {
  "1D": "APY (24h)",
  "1W": "APY (7d)",
  "1M": "APY (30d)",
};

type PoolInfoProps = {
  selectedApyPeriod: ApyPeriod;
};

const PoolInfo = ({ selectedApyPeriod }: PoolInfoProps) => {
  const poolInfo = useTwilightStore((state) => state.lend.poolInfo);
  const currentPrice = useSessionStore((state) => state.price.btcPrice);

  const { data: poolShareValue } = useGetPoolShareValue();
  const { data: chartData } = useApyChartData(APY_PERIOD_PARAMS[selectedApyPeriod]);

  const displayApy = useMemo(() => {
    if (selectedApyPeriod === "1D") {
      return poolInfo?.apy;
    }
    if (chartData && chartData.length > 0) {
      return chartData[chartData.length - 1]?.value;
    }
    return undefined;
  }, [selectedApyPeriod, poolInfo?.apy, chartData]);

  const isApyLoaded = selectedApyPeriod === "1D" ? !!poolInfo : !!chartData?.length;

  return (
    <div className="flex flex-row flex-wrap gap-6 md:gap-12">
      <div className="flex flex-col">
        <Text className="text-sm text-primary-accent">{APY_LABELS[selectedApyPeriod]}</Text>
        <Resource
          isLoaded={isApyLoaded}
          placeholder={<Skeleton className="h-6 w-16" />}
        >
          <Text className="text-xl font-semibold">
            {displayApy != null ? displayApy.toFixed(2) : "0.00"}%
          </Text>
        </Resource>
      </div>

  const isApyLoaded =
    selectedApyPeriod === "1D" ? !!poolInfo : !!chartData?.length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-row flex-wrap gap-6 md:gap-12">
        <StatBlock
          label={
            <Tooltip
              title="Pool APY"
              body="Estimated annualized yield based on the pool's performance over the selected period. This is an annualized projection, not a guarantee."
            >
              <Text className="text-sm text-primary-accent">
                {APY_LABELS[selectedApyPeriod]}
              </Text>
            </Tooltip>
          }
          value={
            displayApy != null ? `${displayApy.toFixed(2)}%` : "—"
          }
          isLoaded={isApyLoaded}
          placeholder={<Skeleton className="h-5 w-16" />}
        />
        <StatBlock
          label={
            <Tooltip
              title="Pool Equity"
              body="Total BTC value backing the pool. This is the capital that absorbs trader PnL and supports open interest."
            >
              <Text className="text-sm text-primary-accent">
                Pool Equity (BTC)
              </Text>
            </Tooltip>
          }
          value={
            poolInfo?.tvl_btc != null
              ? `${poolInfo.tvl_btc.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 6,
                })} BTC`
              : "—"
          }
          isLoaded={!!poolInfo}
          placeholder={<Skeleton className="h-5 w-24" />}
        />
        <StatBlock
          label={
            <Tooltip
              title="Share NAV"
              body="Net asset value per pool share. Computed from pool equity divided by total pool shares. Used to value deposits and rewards."
            >
              <Text className="text-sm text-primary-accent">Share NAV</Text>
            </Tooltip>
          }
          value={
            poolShareValue != null
              ? `${poolShareValue.toFixed(0)} sats`
              : "—"
          }
          isLoaded={poolShareValue != null}
          placeholder={<Skeleton className="h-5 w-16" />}
        />
      </div>
      <div className="flex flex-row flex-wrap gap-6 md:gap-12">
        <StatBlock
          label={
            <Tooltip
              title="Pool Return"
              body="Actual return over the selected period (not annualized). Derived from the pool's share NAV change over that window."
            >
              <Text className="text-sm text-primary-accent">
                {RETURN_LABELS[selectedApyPeriod]}
              </Text>
            </Tooltip>
          }
          value={
            displayReturn != null ? formatReturnPct(displayReturn) : "—"
          }
          isLoaded={isApyLoaded}
          placeholder={<Skeleton className="h-5 w-20" />}
        />
        <StatBlock
          label={<Text className="text-sm text-primary-accent">BTC Price</Text>}
          value={`$${currentPrice?.toLocaleString() || "—"}`}
          isLoaded={!!currentPrice}
          placeholder={<Skeleton className="h-5 w-20" />}
        />
      </div>
    </div>
  );
};

export default PoolInfo;
