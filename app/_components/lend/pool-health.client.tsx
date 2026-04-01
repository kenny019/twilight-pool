"use client";

import { Text } from "@/components/typography";
import Resource from "@/components/resource";
import Skeleton from "@/components/skeleton";
import useGetMarketStats from "@/lib/hooks/useGetMarketStats";
import { Tooltip } from "@/components/tooltip";
import {
  formatUtilizationPct,
  getUtilSeverity,
  getNetDirection,
} from "@/lib/utils/lend-metrics";
import { ArrowUp, ArrowDown, Minus } from "lucide-react";
import cn from "@/lib/cn";

const UTIL_STYLES = {
  LOW: "bg-green-medium/10 text-green-medium",
  MEDIUM: "bg-yellow-500/10 text-yellow-500",
  HIGH: "bg-red/10 text-red",
} as const;

const DIR_STYLES = {
  LONG: "text-green-medium",
  SHORT: "text-red",
  NEUTRAL: "text-primary/50",
} as const;

function UtilizationBadge({ utilPct }: { utilPct: number }) {
  const severity = getUtilSeverity(utilPct);
  if (severity == null) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-2 py-0.5 text-[11px] font-medium",
        UTIL_STYLES[severity]
      )}
    >
      {severity}
    </span>
  );
}

function NetExposureDirection({ netBtc }: { netBtc: number }) {
  const dir = getNetDirection(netBtc);
  const Icon =
    dir === "LONG" ? ArrowUp : dir === "SHORT" ? ArrowDown : Minus;
  const label =
    dir === "LONG" ? "Net Long" : dir === "SHORT" ? "Net Short" : "Neutral";

  return (
    <span className={cn("inline-flex items-center gap-1 text-[11px] font-medium", DIR_STYLES[dir])}>
      <Icon className="h-3 w-3 shrink-0" />
      {label}
    </span>
  );
}

function formatNetExposureBtc(sats: number): string {
  const btc = sats / 1e8;
  return `${Math.abs(btc).toFixed(4)} BTC`;
}

export default function PoolHealth() {
  const { data, isLoading } = useGetMarketStats();

  const utilization =
    data != null
      ? data.pool_equity_btc > 0
        ? data.utilization
        : 0
      : undefined;

  const utilPct =
    utilization != null ? (utilization <= 1 ? utilization * 100 : utilization) : NaN;
  const netBtc = data != null ? data.net_exposure_btc / 1e8 : 0;

  return (
    <div className="grid grid-cols-2 gap-3 md:gap-x-8">
      <div className="min-w-0 flex flex-col gap-1">
        <Tooltip
          title="Exposure Utilization"
          body="How loaded the pool is: Open Interest ÷ Pool Equity. Higher utilization means the pool is carrying more leveraged exposure and becomes more sensitive to volatility. Low / Medium / High is a simple load indicator — not a guarantee."
        >
          <Text className="text-xs text-primary-accent md:text-sm">
            Exposure Utilization
          </Text>
        </Tooltip>
        <Resource
          isLoaded={!isLoading && utilization !== undefined}
          placeholder={<Skeleton className="h-5 w-16" />}
        >
          <div className="flex flex-wrap items-center gap-2">
            <Text className="text-sm font-medium md:text-base">
              {utilization !== undefined
                ? formatUtilizationPct(utilization)
                : "—"}
            </Text>
            {utilization !== undefined && !Number.isNaN(utilPct) && (
              <UtilizationBadge utilPct={utilPct} />
            )}
          </div>
          {utilization !== undefined && !Number.isNaN(utilPct) && (
            <div className="mt-1 h-1 w-20 overflow-hidden rounded-full bg-primary/10 md:w-24">
              <div
                className="h-full rounded-full bg-primary/30"
                style={{ width: `${Math.min(utilPct, 100)}%` }}
              />
            </div>
          )}
        </Resource>
      </div>
      <div className="min-w-0 flex flex-col gap-1">
        <Tooltip
          title="Net Exposure"
          body="Directional imbalance: Total Long exposure − Total Short exposure. Positive means net-long; negative means net-short."
        >
          <Text className="text-xs text-primary-accent md:text-sm">Net Exposure</Text>
        </Tooltip>
        <Resource
          isLoaded={!isLoading && data != null}
          placeholder={<Skeleton className="h-5 w-32" />}
        >
          {data != null ? (
            <div className="flex flex-col gap-0.5">
              <Text className="text-sm font-medium md:text-base">
                {formatNetExposureBtc(data.net_exposure_btc)}
              </Text>
              <NetExposureDirection netBtc={netBtc} />
            </div>
          ) : (
            <Text>—</Text>
          )}
        </Resource>
      </div>
    </div>
  );
}
