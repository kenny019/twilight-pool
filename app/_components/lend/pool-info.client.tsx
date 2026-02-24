"use client";

import { Text } from "@/components/typography";
import Resource from "@/components/resource";
import Skeleton from "@/components/skeleton";
import { useTwilightStore } from "@/lib/providers/store";
import { useSessionStore } from "@/lib/providers/session";
import React, { useMemo } from "react";
import { useGetPoolShareValue } from "@/lib/hooks/useGetPoolShareValue";
import {
  useApyChartData,
  APY_PERIOD_PARAMS,
  ApyPeriod,
} from "@/lib/hooks/useApyChartData";
import { Tooltip } from "@/components/tooltip";
import {
  median,
  periodReturnFromApy,
  formatReturnPct,
} from "@/lib/utils/lend-metrics";

const APY_LABELS: Record<ApyPeriod, string> = {
  "1D": "Pool APY (1D)",
  "1W": "Pool APY (7D)",
  "1M": "Pool APY (30D)",
};

const RETURN_LABELS: Record<ApyPeriod, string> = {
  "1D": "Pool Return (1D)",
  "1W": "Pool Return (7D)",
  "1M": "Pool Return (30D)",
};

const PERIOD_DAYS: Record<ApyPeriod, number> = {
  "1D": 1,
  "1W": 7,
  "1M": 30,
};

const MEDIAN_N: Record<ApyPeriod, number | undefined> = {
  "1D": undefined,
  "1W": 6,
  "1M": 4,
};

type PoolInfoProps = {
  selectedApyPeriod: ApyPeriod;
};

const StatBlock = ({
  label,
  value,
  isLoaded,
  placeholder,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  isLoaded: boolean;
  placeholder: React.ReactNode;
}) => (
  <div className="flex flex-col gap-1">
    {label}
    <Resource isLoaded={isLoaded} placeholder={placeholder}>
      <Text className="text-base font-semibold">{value}</Text>
    </Resource>
  </div>
);

const PoolInfo = ({ selectedApyPeriod }: PoolInfoProps) => {
  const poolInfo = useTwilightStore((state) => state.lend.poolInfo);
  const currentPrice = useSessionStore((state) => state.price.btcPrice);

  const { data: poolShareValue } = useGetPoolShareValue();
  const { data: chartData } = useApyChartData(
    APY_PERIOD_PARAMS[selectedApyPeriod]
  );

  const { displayApy, displayReturn } = useMemo(() => {
    let apy: number | undefined;
    if (selectedApyPeriod === "1D") {
      apy = poolInfo?.apy;
    } else if (chartData?.length) {
      const values = chartData.map((p) => p.value);
      apy = median(values, MEDIAN_N[selectedApyPeriod]) ?? undefined;
    }
    const returnVal =
      apy != null
        ? periodReturnFromApy(apy, PERIOD_DAYS[selectedApyPeriod])
        : undefined;
    return { displayApy: apy, displayReturn: returnVal };
  }, [selectedApyPeriod, poolInfo?.apy, chartData]);

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
