"use client";

import cn from "@/lib/cn";
import { usePnlDisplayMode } from "@/lib/providers/pnl-display-mode";
import { formatPnlWithUsd } from "@/lib/utils/formatPnl";
import BTC from "@/lib/twilight/denoms";
import Big from "big.js";

type PnlHeaderProps = {
  variant: "uPnL" | "PnL";
};

export function PnlHeader({ variant }: PnlHeaderProps) {
  const { pnlDisplayMode, togglePnlDisplayMode } = usePnlDisplayMode();
  const label = variant === "uPnL" ? "uPnL" : "PnL";
  const suffix = pnlDisplayMode === "btc" ? "BTC" : "USD";

  return (
    <button
      type="button"
      onClick={togglePnlDisplayMode}
      className="cursor-pointer hover:underline text-start"
      title="Click to switch between BTC and USD"
    >
      {label} ({suffix})
    </button>
  );
}

type PnlCellProps = {
  pnlSats: number | null | undefined;
  btcPriceUsd: number;
  className?: string;
};

export function PnlCell({ pnlSats, btcPriceUsd, className }: PnlCellProps) {
  const { pnlDisplayMode } = usePnlDisplayMode();

  if (pnlSats === undefined || pnlSats === null) {
    return <span className={cn("text-xs text-gray-500", className)}>—</span>;
  }

  const isPositive = pnlSats > 0;
  const isNegative = pnlSats < 0;

  const displayValue =
    pnlDisplayMode === "btc"
      ? BTC.format(new BTC("sats", Big(pnlSats)).convert("BTC"), "BTC")
      : formatPnlWithUsd(pnlSats, btcPriceUsd);

  const prefix = isPositive ? "+" : "";

  return (
    <span
      className={cn(
        "text-xs font-medium",
        isPositive && "text-green-medium",
        isNegative && "text-red",
        !isPositive && !isNegative && "text-gray-500",
        className
      )}
    >
      {prefix}
      {displayValue}
    </span>
  );
}
