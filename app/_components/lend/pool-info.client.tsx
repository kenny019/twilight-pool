"use client";

import { Text } from "@/components/typography";
import Resource from "@/components/resource";
import cn from "@/lib/cn";
import Skeleton from "@/components/skeleton";
import { useTwilightStore } from "@/lib/providers/store";
import { useSessionStore } from "@/lib/providers/session";
import React, { useMemo, useState } from "react";
import { useGetPoolShareValue } from "@/lib/hooks/useGetPoolShareValue";
import {
  useApyChartData,
  APY_PERIOD_PARAMS,
  ApyPeriod,
} from "@/lib/hooks/useApyChartData";
import { Tooltip } from "@/components/tooltip";
import { ChevronDown, ChevronUp } from "lucide-react";
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
  valueClassName = "text-base font-semibold",
  containerClassName = "flex flex-col gap-1",
  fixedLabelHeight = false,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  isLoaded: boolean;
  placeholder: React.ReactNode;
  valueClassName?: string;
  containerClassName?: string;
  fixedLabelHeight?: boolean;
}) => (
  <div className={containerClassName}>
    <div className={fixedLabelHeight ? "min-h-[1.25rem]" : undefined}>{label}</div>
    <Resource isLoaded={isLoaded} placeholder={placeholder}>
      <Text className={valueClassName}>{value}</Text>
    </Resource>
  </div>
);

const PoolInfo = ({ selectedApyPeriod }: PoolInfoProps) => {
  const [showSupportingDetails, setShowSupportingDetails] = useState(false);
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

  const shareNavStat = (
    <StatBlock
      label={
        <Tooltip
          title="Share NAV"
          body="Net asset value per pool share. Computed from pool equity divided by total pool shares. Used to value deposits and rewards."
          className="gap-0.5"
        >
          <Text className="text-xs text-primary-accent/50">Share NAV</Text>
        </Tooltip>
      }
      value={poolShareValue != null ? `${poolShareValue.toFixed(0)} sats` : "—"}
      isLoaded={poolShareValue != null}
      placeholder={<Skeleton className="h-4 w-14" />}
      valueClassName="text-sm font-medium text-primary/55 md:text-base"
      containerClassName="flex flex-col gap-1"
      fixedLabelHeight
    />
  );

  const btcPriceStat = (
    <StatBlock
      label={
        <div className="flex min-h-[1.25rem] items-center">
          <Text className="text-xs text-primary-accent/50">BTC Price</Text>
        </div>
      }
      value={`$${currentPrice?.toLocaleString() || "—"}`}
      isLoaded={!!currentPrice}
      placeholder={<Skeleton className="h-4 w-16" />}
      valueClassName="text-sm font-medium text-primary/55 md:text-base"
      containerClassName="flex flex-col gap-1"
      fixedLabelHeight
    />
  );

  return (
    <div className="flex flex-col gap-4 md:gap-5">
      {/* Dominant: APY — label and value as one tight unit */}
      <StatBlock
        label={
          <Tooltip
            title="Pool APY"
            body="Estimated annualized yield based on the pool's performance over the selected period. This is an annualized projection, not a guarantee."
          >
            <Text className="text-xs text-primary-accent">
              {APY_LABELS[selectedApyPeriod]}
            </Text>
          </Tooltip>
        }
        value={displayApy != null ? `${displayApy.toFixed(2)}%` : "—"}
        isLoaded={isApyLoaded}
        placeholder={<Skeleton className="h-8 w-20" />}
        containerClassName="flex flex-col gap-0.5"
        valueClassName={cn(
          "text-2xl font-bold leading-none lg:text-4xl",
          displayApy != null && displayApy > 0 && "text-green-medium/80",
          displayApy != null && displayApy < 0 && "text-red"
        )}
      />

      {/* Secondary + Supporting — merged into one responsive row, separated by a rule */}
      <div className="grid grid-cols-2 gap-x-3 gap-y-3 border-t border-outline/[0.06] pt-4 md:gap-y-4 lg:grid-cols-4 lg:gap-x-0 lg:divide-x lg:divide-outline/[0.06] lg:pt-5">
        <StatBlock
          label={
            <Tooltip
              title="Pool Equity"
              body="Total BTC value backing the pool. This is the capital that absorbs trader PnL and supports open interest."
              className="gap-0.5"
            >
              <Text className="text-xs text-primary-accent">Pool Equity</Text>
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
          valueClassName="text-sm font-semibold lg:text-lg"
          containerClassName="flex flex-col gap-1 lg:pr-4"
          fixedLabelHeight
        />
        <StatBlock
          label={
            <Tooltip
              title="Pool Return"
              body="Actual return over the selected period (not annualized). Derived from the pool's share NAV change over that window."
              className="gap-0.5"
            >
              <Text className="text-xs text-primary-accent">
                {RETURN_LABELS[selectedApyPeriod]}
              </Text>
            </Tooltip>
          }
          value={displayReturn != null ? formatReturnPct(displayReturn) : "—"}
          isLoaded={isApyLoaded}
          placeholder={<Skeleton className="h-5 w-20" />}
          valueClassName="text-sm font-semibold lg:text-lg"
          containerClassName="flex flex-col gap-1 lg:px-4"
          fixedLabelHeight
        />
        <StatBlock
          label={shareNavStat.props.label}
          value={shareNavStat.props.value}
          isLoaded={shareNavStat.props.isLoaded}
          placeholder={shareNavStat.props.placeholder}
          valueClassName="hidden md:block text-sm font-medium text-primary/55 lg:text-base"
          containerClassName="hidden md:flex md:flex-col md:gap-1 lg:px-4"
          fixedLabelHeight
        />
        <StatBlock
          label={btcPriceStat.props.label}
          value={btcPriceStat.props.value}
          isLoaded={btcPriceStat.props.isLoaded}
          placeholder={btcPriceStat.props.placeholder}
          valueClassName="hidden md:block text-sm font-medium text-primary/55 lg:text-base"
          containerClassName="hidden md:flex md:flex-col md:gap-1 lg:pl-4"
          fixedLabelHeight
        />
      </div>

      <div className="md:hidden">
        <button
          type="button"
          onClick={() => setShowSupportingDetails((prev) => !prev)}
          className="flex min-h-[44px] w-full items-center justify-between border-t border-outline/[0.06] pt-3 text-xs text-primary/50 transition-colors hover:text-primary/70"
        >
          <span>{showSupportingDetails ? "Hide details" : "More details"}</span>
          {showSupportingDetails ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>

        {showSupportingDetails && (
          <div className="mt-2 grid grid-cols-2 gap-3">
            {shareNavStat}
            {btcPriceStat}
          </div>
        )}
      </div>
    </div>
  );
};

export default PoolInfo;
