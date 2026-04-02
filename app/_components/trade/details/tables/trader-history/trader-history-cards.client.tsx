"use client";

import FundingHistoryDialog from "@/components/funding-history-dialog";
import cn from "@/lib/cn";
import { formatMarginPair, formatSatsCompact, truncateHash } from "@/lib/helpers";
import { usdNumberFormatter } from "@/lib/utils/format";
import { useToast } from "@/lib/hooks/useToast";
import { usePriceFeed } from "@/lib/providers/feed";
import { useSessionStore } from "@/lib/providers/session";
import BTC from "@/lib/twilight/denoms";
import { TradeOrder } from "@/lib/types";
import { PnlCell } from "@/lib/components/pnl-display";
import Big from "big.js";
import dayjs from "dayjs";
import { ChevronDown, ChevronUp, Info } from "lucide-react";
import React, { useCallback, useMemo, useState, useSyncExternalStore } from "react";

interface TraderHistoryCardsProps {
  data: TradeOrder[];
}

const TraderHistoryCards = React.memo(function TraderHistoryCards({
  data,
}: TraderHistoryCardsProps) {
  const { toast } = useToast();
  const storedBtcPrice = useSessionStore((state) => state.price.btcPrice);
  const { getCurrentPrice, subscribe } = usePriceFeed();
  const currentPrice = useSyncExternalStore(subscribe, getCurrentPrice, () => 0);
  const btcPriceUsd = currentPrice || storedBtcPrice;

  const [fundingDialogTrade, setFundingDialogTrade] = useState<TradeOrder | null>(null);
  const [isFundingDialogOpen, setIsFundingDialogOpen] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

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
    () => [...data].sort((a, b) => dayjs(b.date).valueOf() - dayjs(a.date).valueOf()),
    [data]
  );

  return (
    <>
      <div
        className="relative w-full overscroll-none px-3 py-2"
      >
        <div className="grid grid-cols-1 gap-2.5 xl:grid-cols-2">
          {sorted.length === 0 ? (
            <div className="py-10 text-center text-sm text-primary-accent">No results.</div>
          ) : (
            sorted.map((trade) => {
              const cardId = `${trade.uuid}_${trade.date.toString()}`;
              const isExpanded = expandedIds.has(cardId);
              const truncatedUuid = truncateHash(trade.uuid, 4, 4);

              const pnl =
                trade.orderStatus === "LIQUIDATE"
                  ? -trade.initialMargin
                  : trade.realizedPnl || trade.unrealizedPnl || 0;

              const funding =
                trade.fundingApplied != null
                  ? Number(trade.fundingApplied)
                  : Math.round(
                      trade.initialMargin -
                        trade.availableMargin -
                        trade.feeFilled -
                        trade.feeSettled +
                        pnl
                    );

              const feeRaw = trade.orderStatus === "FILLED" ? trade.feeFilled : trade.feeSettled;
              const isClosed =
                trade.orderStatus === "SETTLED" || trade.orderStatus === "LIQUIDATE";
              const hasPnl =
                (trade.orderStatus === "SETTLED" ||
                  trade.orderStatus === "LIQUIDATE" ||
                  trade.orderStatus === "FILLED") &&
                pnl !== 0;

              // Outcome-driven color signal (not side, not status)
              const outcomeTone =
                trade.orderStatus === "LIQUIDATE" || (hasPnl && pnl < 0)
                  ? "negative"
                  : hasPnl && pnl > 0
                    ? "positive"
                    : "neutral";

              const accentBar =
                outcomeTone === "positive"
                  ? "bg-green-medium/70"
                  : outcomeTone === "negative"
                    ? "bg-red/70"
                    : "bg-border/70";

              const statusDot =
                outcomeTone === "positive"
                  ? "bg-green-medium"
                  : outcomeTone === "negative"
                    ? "bg-red"
                    : "bg-border/80";

              // Side is identity, not direction-colored
              const sideClass = "border border-border/50 bg-background/60 text-primary/65";

              const statusClass = "border border-border/40 bg-background/50 text-primary/50";

              // Zone 2: price story
              const entryLabel = `$${usdNumberFormatter.format(trade.entryPrice)}`;
              const closeLabel = isClosed
                ? `$${usdNumberFormatter.format(trade.settlementPrice)}`
                : null;

              // Zone 3: cost row (never wraps)
              const notionalLabel = `$${usdNumberFormatter.format(
                Number(new BTC("sats", Big(trade.positionSize)).convert("BTC").toFixed(2)) || 0
              )}`;
              const levLabel = `${trade.leverage.toFixed(1)}x`;
              const feeLabel =
                isClosed || trade.orderStatus === "FILLED" ? formatSatsCompact(feeRaw) : "—";
              const [availLabel, maintLabel] = formatMarginPair(
                trade.availableMargin,
                trade.maintenanceMargin
              );

              // Expanded secondary details
              const liqLabel = trade.liquidationPrice
                ? `$${usdNumberFormatter.format(trade.liquidationPrice)}`
                : "—";
              const posValueSats = Math.round(
                Math.abs(trade.positionSize / (trade.settlementPrice || trade.entryPrice || 1))
              );
              const posValueLabel = formatSatsCompact(posValueSats);

              return (
                <div
                  key={cardId}
                  className="group relative overflow-hidden rounded-xl border border-border/70 bg-background/90 shadow-sm transition-all duration-150 hover:-translate-y-[1px] hover:border-border hover:shadow-md"
                >
                  {/* Left accent bar */}
                  <div className={cn("absolute inset-y-0 left-0 w-0.5", accentBar)} />

                  <div className="px-3 py-2.5 pl-[14px] max-md:px-3 max-md:py-3">
                    {/* Zone 1 — Identity */}
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={cn(
                            "rounded px-1.5 py-0.5 text-[11px] font-semibold",
                            sideClass
                          )}
                        >
                          {trade.positionType}
                        </span>
                        <span
                          className={cn(
                            "rounded px-1.5 py-0.5 text-[10px] font-medium",
                            statusClass
                          )}
                        >
                          {trade.orderStatus}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-primary/55">
                        <span className="tabular-nums">
                          {dayjs(trade.date).format("DD MMM HH:mm:ss")}
                        </span>
                        <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", statusDot)} />
                      </div>
                    </div>

                    {/* ── Dominant: outcome amount ── */}
                    <div className="mb-2">
                      {hasPnl ? (
                        <PnlCell pnlSats={pnl} btcPriceUsd={btcPriceUsd} layout="hero" />
                      ) : (
                        <div className="rounded-lg border-l-2 border-border/60 bg-background/40 px-3 py-2.5">
                          <span className="block text-lg font-semibold leading-tight tabular-nums text-primary">
                            {notionalLabel}
                          </span>
                          <span className="mt-0.5 block text-sm tabular-nums text-primary/60">Notional</span>
                        </div>
                      )}
                    </div>

                    {/* ── Trade context: entry/close, notional, lev ── */}
                    <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px]">
                      <span className="inline-flex items-center gap-1 whitespace-nowrap">
                        <span className="text-primary/40">Entry</span>
                        <span className="font-medium text-primary/80">{entryLabel}</span>
                      </span>
                      {closeLabel && (
                        <>
                          <span className="text-primary/30">→</span>
                          <span className="inline-flex items-center gap-1 whitespace-nowrap">
                            <span className="text-primary/40">Close</span>
                            <span className="font-medium text-primary/80">{closeLabel}</span>
                          </span>
                        </>
                      )}
                      <span className="text-primary/25">•</span>
                      <span className="inline-flex items-center gap-1 whitespace-nowrap">
                        <span className="text-primary/40">Notional</span>
                        <span className="font-medium text-primary/80">{notionalLabel}</span>
                      </span>
                      <span className="text-primary/25">•</span>
                      <span className="inline-flex items-center gap-1 whitespace-nowrap">
                        <span className="text-primary/40">Lev</span>
                        <span className="font-medium text-primary/80">{levLabel}</span>
                      </span>
                    </div>

                    {/* Expand toggle + secondary details */}
                    <div className="mt-1.5 border-t border-border/30 pt-1 max-md:pt-2">
                      <button
                        type="button"
                        onClick={() => toggleExpand(cardId)}
                        className="flex w-full items-center justify-between rounded px-0.5 py-2 text-[10px] uppercase tracking-wide text-primary/40 transition-colors duration-150 hover:bg-primary/5 hover:text-primary/60 max-md:min-h-[44px] md:py-0.5"
                      >
                        <span>Details</span>
                        {isExpanded ? (
                          <ChevronUp className="h-3 w-3" />
                        ) : (
                          <ChevronDown className="h-3 w-3" />
                        )}
                      </button>

                      {isExpanded && (
                        <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-2.5 text-[11px]">
                          <div className="flex items-center gap-2">
                            <span className="shrink-0 text-[10px] uppercase tracking-wide text-primary/40">Fee</span>
                            <span className="font-medium">{feeLabel}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="shrink-0 text-[10px] uppercase tracking-wide text-primary/40">Avail</span>
                            <span className="font-medium">{availLabel}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="shrink-0 text-[10px] uppercase tracking-wide text-primary/40">Maint.</span>
                            <span className="font-medium">{maintLabel}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="shrink-0 text-[10px] uppercase tracking-wide text-primary/40">Liq</span>
                            <span className="font-medium">{liqLabel}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="shrink-0 text-[10px] uppercase tracking-wide text-primary/40">Pos. Value</span>
                            <span className="font-medium">{posValueLabel}</span>
                          </div>
                          <div className="col-span-2 flex items-center gap-2">
                            <span className="shrink-0 text-[10px] uppercase tracking-wide text-primary/40">Order ID</span>
                            <button
                              type="button"
                              className="min-w-0 truncate font-medium transition-colors duration-150 hover:text-primary hover:underline"
                              onClick={() => {
                                navigator.clipboard.writeText(trade.uuid);
                                toast({ title: "Copied to clipboard", description: `Order ID ${truncatedUuid} copied` });
                              }}
                            >
                              {trade.uuid}
                            </button>
                          </div>
                          <div className="col-span-2 flex items-center gap-2">
                            <span className="shrink-0 text-[10px] uppercase tracking-wide text-primary/40">Funding</span>
                            <span className="font-medium">{formatSatsCompact(funding)}</span>
                            {isClosed && (
                              <button
                                type="button"
                                onClick={(e) => { e.preventDefault(); openFundingDialog(trade); }}
                                className="ml-1 shrink-0 rounded p-1 text-primary/35 transition-all duration-150 hover:scale-105 hover:bg-primary/5 hover:text-primary/65"
                                aria-label="View funding history"
                              >
                                <Info className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                          <div className="col-span-2 flex items-start gap-2">
                            <span className="shrink-0 text-[10px] uppercase tracking-wide text-primary/40">Tx Hash</span>
                            {trade.tx_hash ? (
                              <button
                                type="button"
                                className="min-w-0 break-all text-left font-medium transition-colors duration-150 hover:text-primary hover:underline"
                                onClick={() => {
                                  navigator.clipboard.writeText(trade.tx_hash);
                                  toast({
                                    title: "Copied to clipboard",
                                    description: `Tx hash ${truncateHash(trade.tx_hash, 6, 6)} copied`,
                                  });
                                }}
                              >
                                {trade.tx_hash}
                              </button>
                            ) : (
                              <span className="font-medium text-primary/45">—</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

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

export default TraderHistoryCards;
