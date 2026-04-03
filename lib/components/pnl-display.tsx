"use client";

import cn from "@/lib/cn";
import { formatPnlWithUsd } from "@/lib/utils/formatPnl";
import { formatSatsCompact } from "@/lib/helpers";

type PnlHeaderProps = {
  variant: "uPnL" | "PnL";
};

export function PnlHeader({ variant }: PnlHeaderProps) {
  const label = variant === "uPnL" ? "uPnL" : "PnL";
  return <span>{label}</span>;
}

type PnlCellProps = {
  pnlSats: number | null | undefined;
  btcPriceUsd: number;
  className?: string;
  /**
   * stacked    = table default (BTC + USD stacked, small)
   * inline     = one line BTC + ( ~USD) — desktop rows
   * responsive = stacked on mobile, inline from md
   * hero       = mobile full-width hero block (BTC text-2xl, USD text-sm below, bg tint)
   */
  layout?: "stacked" | "inline" | "responsive" | "hero";
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
  const btcValue = formatSatsCompact(pnlSats, { signed: true });
  const showUsdValue = btcPriceUsd > 0;
  const usdValue = showUsdValue ? formatPnlWithUsd(pnlSats, btcPriceUsd) : null;
  const toneClass = cn(
    isPositive && "text-green-medium",
    isNegative && "text-red",
    !isPositive && !isNegative && "text-primary/40"
  );

  // ── Hero (mobile full-width PnL block) ──────────────────────────────────
  if (layout === "hero") {
    const borderAccent = isPositive
      ? "border-green-medium/60"
      : isNegative
        ? "border-red/60"
        : "border-primary/20";
    const bgTint = isPositive
      ? "bg-green-medium/[0.04]"
      : isNegative
        ? "bg-red/[0.04]"
        : "bg-primary/[0.02]";

    return (
      <div
        className={cn(
          "rounded-lg border-l-2 px-3 py-2.5",
          borderAccent,
          bgTint,
          className
        )}
      >
        <span
          className={cn(
            "block text-lg font-semibold leading-tight tabular-nums",
            toneClass
          )}
        >
          {btcValue}
        </span>
        {usdValue && (
          <span
            className={cn(
              "mt-0.5 block text-sm tabular-nums opacity-70",
              toneClass
            )}
          >
            ≈ {prefix}{usdValue}
          </span>
        )}
      </div>
    );
  }

  // ── Inline (desktop rows) ────────────────────────────────────────────────
  if (layout === "inline") {
    return (
      <span
        className={cn(
          "inline-flex min-w-0 flex-wrap items-baseline gap-x-1 leading-tight",
          toneClass
        )}
      >
        <span className={cn("text-sm font-semibold", toneClass, className)}>
          {btcValue}
        </span>
        {usdValue && (
          <span className={cn("shrink-0 whitespace-nowrap text-xs", toneClass)}>
            ( ~{usdValue})
          </span>
        )}
      </span>
    );
  }

  // ── Responsive (old mobile card rows — kept for other usages) ────────────
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
          {btcValue}
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

  // ── Stacked default (tables) ─────────────────────────────────────────────
  return (
    <span className="inline-flex flex-col leading-tight">
      <span className={cn("text-xs font-medium", toneClass, className)}>
        {btcValue}
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
