"use client";

import cn from "@/lib/cn";
import { formatPnlWithUsd } from "@/lib/utils/formatPnl";
import BTC from "@/lib/twilight/denoms";
import Big from "big.js";

type PnlHeaderProps = {
  variant: "uPnL" | "PnL";
};

export function PnlHeader({ variant }: PnlHeaderProps) {
  const label = variant === "uPnL" ? "uPnL" : "PnL";

  return <span>{label} (BTC / USD)</span>;
}

type PnlCellProps = {
  pnlSats: number | null | undefined;
  btcPriceUsd: number;
  className?: string;
  /** stacked = table default; inline = one line BTC + ( ~USD); responsive = mobile matches Entry/Mark row + type scale; desktop inline from md */
  layout?: "stacked" | "inline" | "responsive";
};

export function PnlCell({
  pnlSats,
  btcPriceUsd,
  className,
  layout = "stacked",
}: PnlCellProps) {
  if (pnlSats === undefined || pnlSats === null) {
    return <span className={cn("text-xs text-gray-500", className)}>—</span>;
  }

  const isPositive = pnlSats > 0;
  const isNegative = pnlSats < 0;
  const prefix = isPositive ? "+" : "";
  const btcValue = BTC.format(
    new BTC("sats", Big(pnlSats)).convert("BTC"),
    "BTC"
  );
  const showUsdValue = btcPriceUsd > 0;
  const usdValue = showUsdValue ? formatPnlWithUsd(pnlSats, btcPriceUsd) : null;
  const toneClass = cn(
    isPositive && "text-green-medium",
    isNegative && "text-red",
    !isPositive && !isNegative && "text-gray-500"
  );

  if (layout === "inline") {
    return (
      <span
        className={cn(
          "inline-flex min-w-0 flex-wrap items-baseline gap-x-1 leading-tight",
          toneClass
        )}
      >
        <span className={cn("text-sm font-semibold", toneClass, className)}>
          {prefix}
          {btcValue} BTC
        </span>
        {usdValue && (
          <span className={cn("shrink-0 whitespace-nowrap text-xs", toneClass)}>
            ( ~{usdValue})
          </span>
        )}
      </span>
    );
  }

  if (layout === "responsive") {
    return (
      <span
        className={cn(
          "flex min-w-0 flex-row flex-wrap items-center gap-x-2 leading-tight md:inline-flex md:flex-row md:flex-wrap md:items-center md:gap-x-1.5",
          toneClass
        )}
      >
        <span
          className={cn(
            "min-w-0 shrink text-base font-semibold tabular-nums md:text-sm",
            toneClass,
            className
          )}
        >
          {prefix}
          {btcValue} BTC
        </span>
        {usdValue && (
          <>
            <span
              className={cn(
                "text-base font-semibold tabular-nums md:hidden",
                toneClass
              )}
            >
              {prefix}
              {usdValue}
            </span>
            <span
              className={cn(
                "hidden shrink-0 whitespace-nowrap text-xs tabular-nums md:block",
                toneClass
              )}
            >
              ( ~{usdValue})
            </span>
          </>
        )}
      </span>
    );
  }

  return (
    <span className="inline-flex flex-col leading-tight">
      <span className={cn("text-xs font-medium", toneClass, className)}>
        {prefix}
        {btcValue} BTC
      </span>
      {usdValue && (
        <span className={cn("text-xs", toneClass)}>
          {prefix}
          {usdValue}
        </span>
      )}
    </span>
  );
}
