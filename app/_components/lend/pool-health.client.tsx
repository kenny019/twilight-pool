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
  LOW: "text-emerald-700 bg-emerald-100/70 ring-1 ring-emerald-200 dark:text-emerald-300 dark:bg-emerald-900/30 dark:ring-emerald-800",
  MEDIUM:
    "text-amber-700 bg-amber-100/70 ring-1 ring-amber-200 dark:text-amber-300 dark:bg-amber-900/30 dark:ring-amber-800",
  HIGH:
    "text-rose-700 bg-rose-100/70 ring-1 ring-rose-200 dark:text-rose-300 dark:bg-rose-900/30 dark:ring-rose-800",
} as const;

const DIR_STYLES = {
  LONG: "text-sky-700 bg-sky-100/70 ring-sky-200 dark:text-sky-300 dark:bg-sky-900/30 dark:ring-sky-800",
  SHORT:
    "text-purple-700 bg-purple-100/70 ring-purple-200 dark:text-purple-300 dark:bg-purple-900/30 dark:ring-purple-800",
  NEUTRAL:
    "text-zinc-700 bg-zinc-100/70 ring-zinc-200 dark:text-zinc-300 dark:bg-zinc-900/30 dark:ring-zinc-800",
} as const;

function UtilizationBadge({ utilPct }: { utilPct: number }) {
  const severity = getUtilSeverity(utilPct);
  if (severity == null) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium tracking-wide",
        UTIL_STYLES[severity]
      )}
    >
      {severity}
    </span>
  );
}

function NetExposureBadge({ netBtc }: { netBtc: number }) {
  const dir = getNetDirection(netBtc);
  const Icon =
    dir === "LONG" ? ArrowUp : dir === "SHORT" ? ArrowDown : Minus;
  const label =
    dir === "LONG" ? "NET LONG" : dir === "SHORT" ? "NET SHORT" : "NEUTRAL";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium tracking-wide ring-1",
        DIR_STYLES[dir]
      )}
    >
      <Icon
        className={cn(
          "h-3.5 w-3.5 shrink-0",
          dir === "LONG" && "text-sky-600 dark:text-sky-400",
          dir === "SHORT" && "text-purple-600 dark:text-purple-400",
          dir === "NEUTRAL" && "text-zinc-500 dark:text-zinc-400"
        )}
      />
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
    <div className="flex flex-row flex-wrap gap-6 md:gap-12">
      <div className="flex flex-col gap-1">
        <Tooltip
          title="Exposure Utilization"
          body="How loaded the pool is: Open Interest ÷ Pool Equity. Higher utilization means the pool is carrying more leveraged exposure and becomes more sensitive to volatility. Low / Medium / High is a simple load indicator — not a guarantee."
        >
          <Text className="text-sm text-primary-accent">
            Exposure Utilization
          </Text>
        </Tooltip>
        <Resource
          isLoaded={!isLoading && utilization !== undefined}
          placeholder={<Skeleton className="h-5 w-16" />}
        >
          <div className="flex flex-wrap items-center gap-2">
            <Text className="text-base font-semibold">
              {utilization !== undefined
                ? formatUtilizationPct(utilization)
                : "—"}
            </Text>
            {utilization !== undefined && !Number.isNaN(utilPct) && (
              <UtilizationBadge utilPct={utilPct} />
            )}
          </div>
          {utilization !== undefined && !Number.isNaN(utilPct) && (
            <div className="mt-1 h-1 w-24 overflow-hidden rounded-full bg-primary/10">
              <div
                className="h-full rounded-full bg-primary/30"
                style={{ width: `${Math.min(utilPct, 100)}%` }}
              />
            </div>
          )}
        </Resource>
      </div>
      <div className="flex flex-col gap-1">
        <Tooltip
          title="Net Exposure"
          body="Directional imbalance: Total Long exposure − Total Short exposure. Positive means net-long; negative means net-short."
        >
          <Text className="text-sm text-primary-accent">Net Exposure</Text>
        </Tooltip>
        <Resource
          isLoaded={!isLoading && data != null}
          placeholder={<Skeleton className="h-5 w-32" />}
        >
          <div className="flex flex-wrap items-center gap-2">
            {data != null ? (
              <>
                <NetExposureBadge netBtc={netBtc} />
                <Text className="text-base font-semibold">
                  {formatNetExposureBtc(data.net_exposure_btc)}
                </Text>
              </>
            ) : (
              "—"
            )}
          </div>
        </Resource>
      </div>
    </div>
  );
}
