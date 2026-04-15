"use client";

import Button from "@/components/button";
import { EmptyState } from "@/components/empty-state";
import FundingHistoryDialog from "@/components/funding-history-dialog";
import { Dialog, DialogContent, DialogTitle } from "@/components/dialog";
import { Sheet, SheetContent, SheetTitle } from "@/components/sheet";
import cn from "@/lib/cn";
import {
  formatSatsCompact,
  formatSatsMBtc,
  formatMarginPair,
} from "@/lib/helpers";
import { usdNumberFormatter } from "@/lib/utils/format";
import { useSessionStore } from "@/lib/providers/session";
import { usePriceFeed } from "@/lib/providers/feed";
import { useLimitDialog } from "@/lib/providers/limit-dialogs";
import BTC from "@/lib/twilight/denoms";
import { TradeOrder } from "@/lib/types";
import { PnlCell } from "@/lib/components/pnl-display";
import { INSTRUMENT_LABEL } from "@/lib/constants";
import Big from "big.js";
import dayjs from "dayjs";
import {
  ChevronDown,
  ChevronUp,
  Info,
  Settings2,
  TrendingUp,
  ShieldAlert,
} from "lucide-react";
import { RemoveOrdersDropdown } from "./remove-orders-dropdown";
import React, {
  useCallback,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { calculateUpnl } from "../../../orderbook/my-trades/columns";

interface PositionsCardsProps {
  data: TradeOrder[];
  settleMarketOrder: (trade: TradeOrder, currentPrice: number) => Promise<void>;
  isSettlingOrder: (uuid: string) => boolean;
  cancelOrder: (
    order: TradeOrder,
    options?: { sl_bool?: boolean; tp_bool?: boolean }
  ) => Promise<void>;
  isCancellingOrder: (uuid: string) => boolean;
}

// ── Shared metric cell ──────────────────────────────────────────────────────
function MetricCell({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <span className="text-xs text-primary/60">{label}</span>
      {children}
    </div>
  );
}

const PositionsCards = React.memo(function PositionsCards({
  data,
  settleMarketOrder,
  isSettlingOrder,
  cancelOrder,
  isCancellingOrder,
}: PositionsCardsProps) {
  const { openConditionalDialog } = useLimitDialog();
  const storedBtcPrice = useSessionStore((state) => state.price.btcPrice);
  const { getCurrentPrice, subscribe } = usePriceFeed();
  const currentPrice = useSyncExternalStore(
    subscribe,
    getCurrentPrice,
    () => 0
  );
  const btcPriceUsd = currentPrice || storedBtcPrice;

  const [fundingDialogTrade, setFundingDialogTrade] =
    useState<TradeOrder | null>(null);
  const [isFundingDialogOpen, setIsFundingDialogOpen] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [manageTradeId, setManageTradeId] = useState<string | null>(null);

  const openFundingDialog = useCallback((trade: TradeOrder) => {
    setFundingDialogTrade(trade);
    setIsFundingDialogOpen(true);
  }, []);

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const sorted = useMemo(
    () =>
      [...data].sort(
        (a, b) => dayjs(b.date).valueOf() - dayjs(a.date).valueOf()
      ),
    [data]
  );

  // find trade for manage dialog
  const manageTrade = manageTradeId
    ? (sorted.find((t) => t.uuid === manageTradeId) ?? null)
    : null;

  return (
    <>
      <div className="relative w-full overscroll-none px-3 py-2">
        <div className="grid grid-cols-1 gap-3">
          {sorted.length === 0 ? (
            <EmptyState title="No open positions." />
          ) : (
            sorted.map((trade) => {
              const markPrice = getCurrentPrice() || trade.entryPrice;
              const isSettling = isSettlingOrder(trade.uuid);
              const isExpanded = expandedIds.has(trade.uuid);

              const calculatedUnrealizedPnl = calculateUpnl(
                trade.entryPrice,
                getCurrentPrice(),
                trade.positionType,
                trade.positionSize
              );

              const funding =
                trade.fundingApplied != null
                  ? Number(trade.fundingApplied)
                  : Math.round(
                      trade.initialMargin -
                        trade.availableMargin -
                        trade.feeFilled +
                        (trade.unrealizedPnl || 0)
                    );

              const accentBar =
                trade.positionType === "LONG"
                  ? "bg-green-medium/70"
                  : "bg-red/70";
              const sideClass =
                trade.positionType === "LONG"
                  ? "bg-green-medium/10 text-green-medium"
                  : "bg-red/10 text-red";

              const entryLabel = `$${usdNumberFormatter.format(trade.entryPrice)}`;
              const markLabel = `$${usdNumberFormatter.format(markPrice)}`;
              const hasPnl = calculatedUnrealizedPnl !== 0;

              // Inverse perp: positionSize in USD sats → notional in USD
              const notionalUsd =
                Number(
                  new BTC("sats", Big(trade.positionSize))
                    .convert("BTC")
                    .toFixed(2)
                ) || 0;
              const notionalLabel = `$${usdNumberFormatter.format(notionalUsd)}`;

              // Exposure: BTC controlled (contracts / mark price)
              const positionValue = new BTC(
                "sats",
                Big(Math.abs(trade.positionSize / markPrice))
              ).convert("BTC");
              const exposureBtc = parseFloat(Number(positionValue).toFixed(4));
              const exposureLabel = `${exposureBtc} BTC`;

              const levLabel = `${trade.leverage.toFixed(1)}x`;
              const liqLabel = `$${usdNumberFormatter.format(trade.liquidationPrice)}`;

              // Liquidation distance %
              const liqDistancePct =
                markPrice > 0
                  ? Math.abs(
                      ((markPrice - trade.liquidationPrice) / markPrice) * 100
                    ).toFixed(1)
                  : null;

              // Conditional orders
              const limitPrice = trade.settleLimit?.price
                ? usdNumberFormatter.format(Number(trade.settleLimit.price))
                : null;
              const slPrice = trade.stopLoss?.price
                ? usdNumberFormatter.format(Number(trade.stopLoss.price))
                : null;
              const tpPrice = trade.takeProfit?.price
                ? usdNumberFormatter.format(Number(trade.takeProfit.price))
                : null;
              const hasAnchors = !!(limitPrice || slPrice || tpPrice);

              const [availLabel, maintLabel] = formatMarginPair(
                trade.availableMargin,
                trade.maintenanceMargin
              );

              return (
                <div
                  key={trade.uuid}
                  className="border-border/70 hover:border-theme/35 group relative overflow-hidden rounded-xl border bg-background/90 shadow-sm transition-all duration-150 hover:-translate-y-[1px] hover:shadow-md"
                >
                  {/* Left accent bar */}
                  <div
                    className={cn("absolute inset-y-0 left-0 w-0.5", accentBar)}
                  />

                  {/* ─────────────── DESKTOP layout ─────────────── */}
                  <div className="hidden px-4 py-2.5 pl-[15px] md:block">
                    {/* Desktop header: badge, lev, dot, time | PnL */}
                    <div className="mb-2.5 flex items-start justify-between gap-5">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "rounded px-1.5 py-0.5 text-xs font-semibold",
                            sideClass
                          )}
                        >
                          {trade.positionType}
                        </span>
                        <span className="rounded bg-primary/5 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-primary/70">
                          {levLabel}
                        </span>
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-green-medium" />
                        <span className="text-primary/45 text-[11px] tabular-nums">
                          {dayjs(trade.date).format("DD MMM HH:mm:ss")}
                        </span>
                      </div>
                      <div className="shrink-0 pr-3 text-right xl:pr-4">
                        {hasPnl ? (
                          <PnlCell
                            pnlSats={calculatedUnrealizedPnl}
                            btcPriceUsd={btcPriceUsd}
                            className="text-base font-semibold"
                            layout="responsive"
                          />
                        ) : (
                          <div className="flex flex-col gap-1">
                            <span className="text-primary/35 text-[10px] uppercase tracking-[0.18em]">
                              PnL
                            </span>
                            <span className="font-mono text-base font-semibold text-primary/70">
                              0 sats
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Desktop metric rail */}
                    <div className="border-border/25 grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.15fr)_minmax(0,0.85fr)] gap-5 border-t pr-3 pt-1.5 xl:gap-7 xl:pr-4">
                      <MetricCell label="Entry" className="gap-0.5">
                        <span className="font-mono text-[12px] font-semibold text-primary">
                          {entryLabel}
                        </span>
                      </MetricCell>
                      <MetricCell label="Mark" className="gap-0.5">
                        <span className="font-mono text-[12px] font-semibold text-primary">
                          {markLabel}
                        </span>
                      </MetricCell>
                      <MetricCell label="Notional" className="gap-0.5">
                        <span className="font-mono text-[12px] font-semibold text-primary">
                          {notionalLabel}
                        </span>
                      </MetricCell>
                      <MetricCell label="Exposure" className="gap-0.5">
                        <span className="font-mono text-[12px] font-semibold text-primary">
                          {exposureLabel}
                        </span>
                      </MetricCell>
                      <MetricCell
                        label="Liquidation Price"
                        className="items-end gap-0.5 text-right"
                      >
                        <span className="font-mono text-[12px] font-semibold text-primary">
                          {liqLabel}
                        </span>
                      </MetricCell>
                      <MetricCell
                        label="Buffer to Liq"
                        className="items-end gap-0.5 text-right"
                      >
                        <span
                          className={cn(
                            "font-mono text-[12px] font-semibold",
                            liqDistancePct ? "text-red" : "text-primary/50"
                          )}
                        >
                          {liqDistancePct ? `−${liqDistancePct}%` : "—"}
                        </span>
                      </MetricCell>
                    </div>

                    {/* Desktop anchor pills */}
                    {hasAnchors && (
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {slPrice && (
                          <span className="bg-red/8 rounded-full border border-red/30 px-2 py-0.5 text-[10px] font-medium text-red">
                            SL ${slPrice}
                          </span>
                        )}
                        {tpPrice && (
                          <span className="bg-green-medium/8 rounded-full border border-green-medium/30 px-2 py-0.5 text-[10px] font-medium text-green-medium">
                            TP ${tpPrice}
                          </span>
                        )}
                        {limitPrice && (
                          <span className="bg-yellow-400/8 rounded-full border border-yellow-400/30 px-2 py-0.5 text-[10px] font-medium text-yellow-400">
                            LMT ${limitPrice}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Desktop actions */}
                    <div className="border-border/30 mt-1.5 border-t pt-2">
                      <div className="flex items-center gap-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <Button
                            onClick={async (e) => {
                              e.preventDefault();
                              await settleMarketOrder(trade, getCurrentPrice());
                            }}
                            variant="ui"
                            size="small"
                            disabled={isSettling}
                            className="h-8.5 bg-theme/9 px-4.5 hover:bg-theme/14 min-w-[176px] border-2 border-theme text-[13px] font-semibold text-theme transition-all duration-150 hover:border-theme hover:brightness-110"
                          >
                            {isSettling ? "Closing..." : "Close Market"}
                          </Button>
                          <Button
                            onClick={(e) => {
                              e.preventDefault();
                              openConditionalDialog(
                                trade.accountAddress,
                                "limit"
                              );
                            }}
                            variant="ui"
                            size="small"
                            disabled={isSettling}
                            className={cn(
                              "h-8 min-w-[146px] border-2 border-white/70 px-4 text-[13px] font-medium text-primary transition-all duration-150 hover:border-white/80 hover:text-primary hover:brightness-110",
                              limitPrice
                                ? "bg-yellow-400/8 hover:bg-yellow-400/12 border-yellow-400/70 text-yellow-400"
                                : "hover:bg-background/45 bg-background/25"
                            )}
                          >
                            {limitPrice ? "Update Limit" : "Close Limit"}
                          </Button>
                          <Button
                            onClick={(e) => {
                              e.preventDefault();
                              openConditionalDialog(
                                trade.accountAddress,
                                "sltp"
                              );
                            }}
                            variant="ui"
                            size="small"
                            disabled={isSettling}
                            className={cn(
                              "h-8 min-w-[146px] border-2 border-white/70 px-4 text-[13px] font-medium text-primary transition-all duration-150 hover:border-white/80 hover:text-primary hover:brightness-110",
                              slPrice || tpPrice
                                ? "hover:bg-background/45 bg-background/25"
                                : "text-primary/88 hover:bg-background/45 bg-background/25"
                            )}
                          >
                            {slPrice || tpPrice ? "Update SL/TP" : "Set SL/TP"}
                          </Button>
                        </div>
                        {hasAnchors && (
                          <RemoveOrdersDropdown
                            trade={trade}
                            cancelOrder={cancelOrder}
                            isCancelling={isCancellingOrder(trade.uuid)}
                            disabled={isSettling}
                            variant="cards"
                          />
                        )}
                        <button
                          type="button"
                          onClick={() => toggleExpand(trade.uuid)}
                          className="text-primary/52 hover:text-primary/72 ml-auto flex h-8 shrink-0 items-center gap-1 px-1 text-[11px] font-medium transition-colors duration-150"
                        >
                          <span>{isExpanded ? "Less" : "More"}</span>
                          {isExpanded ? (
                            <ChevronUp className="h-3 w-3" />
                          ) : (
                            <ChevronDown className="h-3 w-3" />
                          )}
                        </button>
                      </div>

                      {/* Desktop expandable details */}
                      {isExpanded && (
                        <div className="border-border/20 mt-2 border-t pr-3 pt-2.5 xl:pr-4">
                          <div className="grid grid-cols-5 gap-x-5 gap-y-1.5">
                            <MetricCell label="Pos. Value">
                              <span className="text-[11px] font-medium tabular-nums">
                                {BTC.format(positionValue, "BTC")}
                              </span>
                            </MetricCell>
                            <MetricCell label="Avail. Margin">
                              <span className="text-[11px] font-medium tabular-nums">
                                {availLabel}
                              </span>
                            </MetricCell>
                            <MetricCell label="Maint. Margin">
                              <span className="text-[11px] font-medium tabular-nums">
                                {maintLabel}
                              </span>
                            </MetricCell>
                            <MetricCell label="Fee">
                              <span className="text-[11px] font-medium tabular-nums">
                                {formatSatsMBtc(trade.feeFilled)}
                              </span>
                            </MetricCell>
                            <MetricCell label="Funding">
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={cn(
                                    "text-[11px] font-medium tabular-nums",
                                    funding > 0
                                      ? "text-green-medium"
                                      : funding < 0
                                        ? "text-red"
                                        : ""
                                  )}
                                >
                                  {formatSatsMBtc(funding)}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    openFundingDialog(trade);
                                  }}
                                  className="rounded p-0.5 text-primary-accent/40 transition-all duration-150 hover:scale-105 hover:bg-theme/20 hover:text-primary-accent"
                                  aria-label="View funding history"
                                >
                                  <Info className="h-3 w-3" />
                                </button>
                              </div>
                            </MetricCell>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ─────────────── MOBILE layout ─────────────── */}
                  <div className="block p-4 md:hidden">
                    {/* ① Header: [LONG] BTCUSD  ●  timestamp */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={cn(
                            "rounded px-1.5 py-0.5 text-[10px] font-semibold",
                            sideClass
                          )}
                        >
                          {trade.positionType}
                        </span>
                        <span className="text-sm font-semibold text-primary/70">
                          {INSTRUMENT_LABEL}
                        </span>
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-green-medium" />
                      </div>
                      <span className="text-xs tabular-nums text-primary/40">
                        {dayjs(trade.date).format("DD MMM HH:mm:ss")}
                      </span>
                    </div>

                    {/* ② PnL Hero — always visible including zero state */}
                    <div className="mt-2">
                      <PnlCell
                        pnlSats={calculatedUnrealizedPnl}
                        btcPriceUsd={btcPriceUsd}
                        layout="hero"
                      />
                    </div>

                    {/* ③ Metrics grid: SIZE / EXPOSURE then ENTRY / MARK then LEV / LIQ */}
                    <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3">
                      <MetricCell label="Size (USD)">
                        <span className="text-sm font-semibold tabular-nums text-primary">
                          {notionalLabel}
                        </span>
                      </MetricCell>
                      <MetricCell label="Exposure (BTC)">
                        <span className="text-sm font-semibold tabular-nums text-primary">
                          {exposureLabel}
                        </span>
                      </MetricCell>
                      <MetricCell label="Entry">
                        <span className="text-sm font-semibold tabular-nums text-primary">
                          {entryLabel}
                        </span>
                      </MetricCell>
                      <MetricCell label="Mark">
                        <span className="text-sm font-semibold tabular-nums text-primary">
                          {markLabel}
                        </span>
                      </MetricCell>
                      <MetricCell label="Leverage">
                        <span className="text-sm font-semibold tabular-nums text-primary">
                          {levLabel}
                        </span>
                      </MetricCell>
                      <MetricCell label="Liquidation">
                        <span className="flex items-baseline gap-1.5">
                          <span className="text-sm font-semibold tabular-nums text-primary">
                            {liqLabel}
                          </span>
                          {liqDistancePct && (
                            <span className="text-xs tabular-nums text-red">
                              -{liqDistancePct}%
                            </span>
                          )}
                        </span>
                      </MetricCell>
                    </div>

                    {/* ④ Orders section (conditional) */}
                    {hasAnchors && (
                      <div className="border-border/30 mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1 border-t pt-3">
                        {slPrice && (
                          <span className="text-sm text-red">
                            <span className="font-normal opacity-60">SL: </span>
                            <span className="font-semibold tabular-nums">
                              ${slPrice}
                            </span>
                          </span>
                        )}
                        {slPrice && (tpPrice || limitPrice) && (
                          <span className="select-none text-primary/25">•</span>
                        )}
                        {tpPrice && (
                          <span className="text-sm text-green-medium">
                            <span className="font-normal opacity-60">TP: </span>
                            <span className="font-semibold tabular-nums">
                              ${tpPrice}
                            </span>
                          </span>
                        )}
                        {tpPrice && limitPrice && (
                          <span className="select-none text-primary/25">•</span>
                        )}
                        {limitPrice && (
                          <span className="text-sm text-yellow-500">
                            <span className="font-normal opacity-60">
                              LMT:{" "}
                            </span>
                            <span className="font-semibold tabular-nums">
                              ${limitPrice}
                            </span>
                          </span>
                        )}
                      </div>
                    )}

                    {/* ⑤ Actions */}
                    <div className="border-border/30 mt-3 flex gap-2 border-t pt-3">
                      <Button
                        variant="ui"
                        disabled={isSettling}
                        onClick={async (e) => {
                          e.preventDefault();
                          await settleMarketOrder(trade, getCurrentPrice());
                        }}
                        className="min-h-[44px] flex-1 border-theme bg-theme/10 text-sm font-semibold text-theme opacity-70 transition-all hover:opacity-100 active:bg-theme/20 disabled:opacity-30"
                      >
                        {isSettling ? "Closing..." : "Close Market"}
                      </Button>
                      <Button
                        variant="ui"
                        disabled={isSettling}
                        onClick={() => setManageTradeId(trade.uuid)}
                        className="min-h-[44px] flex-1 gap-1.5 border-primary/50 text-sm font-medium text-primary opacity-70 hover:opacity-100 disabled:opacity-30"
                      >
                        <Settings2 className="h-3.5 w-3.5" />
                        Manage
                      </Button>
                    </div>

                    {/* ⑥ Details (expandable) */}
                    <button
                      type="button"
                      onClick={() => toggleExpand(trade.uuid)}
                      className="border-border/30 mt-3 flex min-h-[44px] w-full items-center justify-between rounded-md border-t pt-3 text-xs text-primary/50 transition-colors hover:text-primary/70"
                    >
                      <span>Details</span>
                      {isExpanded ? (
                        <ChevronUp className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5" />
                      )}
                    </button>

                    {isExpanded && (
                      <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-3">
                        <MetricCell label="Avail. Margin">
                          <span className="text-sm font-medium tabular-nums">
                            {availLabel}
                          </span>
                        </MetricCell>
                        <MetricCell label="Maint. Margin">
                          <span className="text-sm font-medium tabular-nums">
                            {maintLabel}
                          </span>
                        </MetricCell>
                        <MetricCell label="Fee">
                          <span className="text-sm font-medium tabular-nums">
                            {formatSatsMBtc(trade.feeFilled)}
                          </span>
                        </MetricCell>
                        <MetricCell label="Funding">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={cn(
                                "text-sm font-medium tabular-nums",
                                funding > 0
                                  ? "text-green-medium"
                                  : funding < 0
                                    ? "text-red"
                                    : ""
                              )}
                            >
                              {formatSatsMBtc(funding)}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                openFundingDialog(trade);
                              }}
                              className="rounded p-2 text-primary/40 transition-all duration-150 hover:scale-105 hover:bg-theme/20 hover:text-primary"
                              aria-label="View funding history"
                            >
                              <Info className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </MetricCell>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── Manage sheet (mobile action hub) ── */}
      <Sheet
        open={manageTradeId !== null}
        onOpenChange={(open) => {
          if (!open) setManageTradeId(null);
        }}
      >
        {manageTrade && (
          <SheetContent>
            <SheetTitle className="text-sm font-semibold">
              Manage Position
            </SheetTitle>
            <div className="flex flex-col gap-2 pt-1">
              <Button
                onClick={(e) => {
                  e.preventDefault();
                  openConditionalDialog(manageTrade.accountAddress, "limit");
                  setManageTradeId(null);
                }}
                variant="ui"
                size="small"
                className={cn(
                  "min-h-[44px] w-full gap-2.5 text-sm",
                  manageTrade.settleLimit?.price
                    ? "border-yellow-400/40 text-yellow-400"
                    : ""
                )}
              >
                <TrendingUp className="h-4 w-4 shrink-0" />
                {manageTrade.settleLimit?.price
                  ? "Update Limit Order"
                  : "Set Limit Order"}
              </Button>
              <Button
                onClick={(e) => {
                  e.preventDefault();
                  openConditionalDialog(manageTrade.accountAddress, "sltp");
                  setManageTradeId(null);
                }}
                variant="ui"
                size="small"
                className={cn(
                  "min-h-[44px] w-full gap-2.5 text-sm",
                  manageTrade.stopLoss?.price || manageTrade.takeProfit?.price
                    ? "border-theme/40 text-theme"
                    : ""
                )}
              >
                <ShieldAlert className="h-4 w-4 shrink-0" />
                {manageTrade.stopLoss?.price || manageTrade.takeProfit?.price
                  ? "Update Stop Loss / Take Profit"
                  : "Set Stop Loss / Take Profit"}
              </Button>
              {(manageTrade.settleLimit?.price ||
                manageTrade.stopLoss?.price ||
                manageTrade.takeProfit?.price) && (
                <div className="border-border/30 border-t pt-2">
                  <RemoveOrdersDropdown
                    trade={manageTrade}
                    cancelOrder={cancelOrder}
                    isCancelling={isCancellingOrder(manageTrade.uuid)}
                    disabled={isSettlingOrder(manageTrade.uuid)}
                    variant="inline"
                  />
                </div>
              )}
            </div>
          </SheetContent>
        )}
      </Sheet>

      <FundingHistoryDialog
        trade={fundingDialogTrade}
        open={isFundingDialogOpen}
        onOpenChange={(open) => {
          setIsFundingDialogOpen(open);
          if (!open) setFundingDialogTrade(null);
        }}
      />
    </>
  );
});

export default PositionsCards;
