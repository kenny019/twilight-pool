"use client";

import FundingHistoryDialog from "@/components/funding-history-dialog";
import cn from "@/lib/cn";
import { formatSatsCompact, truncateHash } from "@/lib/helpers";
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

              // Zone 1: accent bar + badges
              const accentBar = trade.orderStatus === "LIQUIDATE"
                ? "bg-red/70"
                : trade.orderStatus === "SETTLED"
                  ? "bg-green-medium/70"
                  : "bg-theme/60";

              const statusDot = trade.orderStatus === "LIQUIDATE"
                ? "bg-red"
                : trade.orderStatus === "SETTLED"
                  ? "bg-green-medium"
                  : "bg-theme";

              const sideClass =
                trade.positionType === "LONG"
                  ? "bg-green-medium/10 text-green-medium"
                  : "bg-red/10 text-red";

              const statusClass =
                trade.orderStatus === "SETTLED"
                  ? "bg-green-medium/10 text-green-medium/80"
                  : trade.orderStatus === "LIQUIDATE"
                    ? "bg-red/10 text-red/80"
                    : "bg-gray-500/10 text-gray-400";

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
              const availLabel = formatSatsCompact(trade.availableMargin);

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
                  className="group relative overflow-hidden rounded-xl border border-border/70 bg-background/90 shadow-sm transition-all duration-150 hover:-translate-y-[1px] hover:border-theme/35 hover:shadow-md"
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

                    {/* Zone 2 — Price Story: mobile grid; desktop inline */}
                    <div className="mb-3 hidden md:flex md:items-center md:justify-between md:gap-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <div className="flex items-baseline gap-1">
                          <span className="text-[10px] uppercase tracking-wide text-gray-500">
                            Entry
                          </span>
                          <span className="text-sm font-semibold text-primary">{entryLabel}</span>
                        </div>
                        {closeLabel && (
                          <>
                            <span className="shrink-0 text-[11px] text-primary/30">→</span>
                            <div className="flex items-baseline gap-1">
                              <span className="text-[10px] uppercase tracking-wide text-gray-500">
                                Close
                              </span>
                              <span className="text-sm font-semibold text-primary">
                                {closeLabel}
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                      {hasPnl && (
                        <div className="flex shrink-0 items-center gap-1">
                          <span className="text-[10px] uppercase tracking-wide text-gray-500">
                            PnL
                          </span>
                          <PnlCell pnlSats={pnl} btcPriceUsd={btcPriceUsd} />
                        </div>
                      )}
                    </div>
                    <div className="mb-3 grid grid-cols-3 gap-y-1 md:hidden">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] uppercase tracking-wide text-gray-500">
                          Entry
                        </span>
                        <span className="text-sm font-semibold tabular-nums text-primary">
                          {entryLabel}
                        </span>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] uppercase tracking-wide text-gray-500">
                          {closeLabel ? "Close" : "Mark"}
                        </span>
                        <span className="text-sm font-semibold tabular-nums text-primary">
                          {closeLabel ?? "—"}
                        </span>
                      </div>
                      {hasPnl && (
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[10px] uppercase tracking-wide text-gray-500">
                            PnL
                          </span>
                          <PnlCell
                            pnlSats={pnl}
                            btcPriceUsd={btcPriceUsd}
                            className="text-sm font-semibold"
                            layout="stacked"
                          />
                        </div>
                      )}
                    </div>

                    {/* Zone 3 — Cost: mobile grid; desktop inline */}
                    <div className="mb-2 grid grid-cols-2 gap-x-4 gap-y-2 md:hidden">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] uppercase tracking-wide text-gray-500">
                          Notional
                        </span>
                        <span className="text-sm font-medium text-primary">{notionalLabel}</span>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] uppercase tracking-wide text-gray-500">
                          Leverage
                        </span>
                        <span className="text-sm font-medium text-primary">{levLabel}</span>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] uppercase tracking-wide text-gray-500">
                          Fee
                        </span>
                        <span className="text-sm font-medium text-primary">{feeLabel}</span>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] uppercase tracking-wide text-gray-500">
                          Avail
                        </span>
                        <span className="text-sm font-medium text-primary">{availLabel}</span>
                      </div>
                    </div>
                    <div className="hidden items-center gap-2 overflow-hidden text-[11px] md:flex">
                      <span className="shrink-0 text-gray-500">Notional</span>
                      <span className="shrink-0 font-medium text-primary/80">{notionalLabel}</span>
                      <span className="shrink-0 text-primary/25">•</span>
                      <span className="shrink-0 text-gray-500">Lev</span>
                      <span className="shrink-0 font-medium text-primary/80">{levLabel}</span>
                      <span className="shrink-0 text-primary/25">•</span>
                      <span className="shrink-0 text-gray-500">Fee</span>
                      <span className="shrink-0 font-medium text-primary/80">{feeLabel}</span>
                      <span className="shrink-0 text-primary/25">•</span>
                      <span className="shrink-0 text-gray-500">Avail</span>
                      <span className="shrink-0 font-medium text-primary/80">{availLabel}</span>
                      {isClosed && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            openFundingDialog(trade);
                          }}
                          className="ml-auto shrink-0 rounded p-1 text-primary-accent/40 transition-all duration-150 hover:scale-105 hover:bg-theme/20 hover:text-primary-accent"
                          aria-label="View funding history"
                        >
                          <Info className="h-3 w-3" />
                        </button>
                      )}
                    </div>

                    {/* Expand toggle + secondary details */}
                    <div className="mt-1.5 border-t border-border/30 pt-1 max-md:pt-2">
                      <button
                        type="button"
                        onClick={() => toggleExpand(cardId)}
                        className="flex w-full items-center justify-between rounded px-0.5 py-2 text-[10px] uppercase tracking-wide text-gray-500 transition-colors duration-150 hover:bg-primary/5 hover:text-primary/60 max-md:min-h-[44px] md:py-0.5"
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
                            <span className="shrink-0 text-[10px] uppercase tracking-wide text-gray-500">
                              Order ID
                            </span>
                            <button
                              type="button"
                              className="rounded font-medium transition-colors duration-150 hover:text-primary hover:underline"
                              onClick={() => {
                                navigator.clipboard.writeText(trade.uuid);
                                toast({
                                  title: "Copied to clipboard",
                                  description: `Order ID ${truncatedUuid} copied`,
                                });
                              }}
                            >
                              {truncatedUuid}
                            </button>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="shrink-0 text-[10px] uppercase tracking-wide text-gray-500">
                              Liq
                            </span>
                            <span className="font-medium">{liqLabel}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="shrink-0 text-[10px] uppercase tracking-wide text-gray-500">
                              Pos. Value
                            </span>
                            <span className="font-medium">{posValueLabel}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="shrink-0 text-[10px] uppercase tracking-wide text-gray-500">
                              Funding
                            </span>
                            <span
                              className={cn(
                                "font-medium",
                                funding > 0
                                  ? "text-green-medium"
                                  : funding < 0
                                    ? "text-red"
                                    : ""
                              )}
                            >
                              {formatSatsCompact(funding)}
                            </span>
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
