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
};

export function PnlCell({ pnlSats, btcPriceUsd, className }: PnlCellProps) {
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

  return (
    <span className="inline-flex flex-col leading-tight">
      <span className={cn("text-xs font-medium", toneClass, className)}>
        {prefix}
        {btcValue} BTC
      </span>
      {usdValue && (
        <span className={cn("text-[10px]", toneClass)}>
          {prefix}
          {usdValue}
        </span>
      )}
    </span>
  );
}
