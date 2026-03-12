"use client";

import FundingHistoryDialog from "@/components/funding-history-dialog";
import cn from "@/lib/cn";
import { formatSatsMBtc, truncateHash } from "@/lib/helpers";
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
import Link from "next/link";
import React, { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";

interface OrderHistoryCardsProps {
  data: TradeOrder[];
}

const OrderHistoryCards = React.memo(function OrderHistoryCards({
  data,
}: OrderHistoryCardsProps) {
  const { toast } = useToast();
  const storedBtcPrice = useSessionStore((state) => state.price.btcPrice);
  const { getCurrentPrice, subscribe } = usePriceFeed();
  const currentPrice = useSyncExternalStore(subscribe, getCurrentPrice, () => 0);
  const btcPriceUsd = currentPrice || storedBtcPrice;

  const [fundingDialogTrade, setFundingDialogTrade] = useState<TradeOrder | null>(null);
  const [isFundingDialogOpen, setIsFundingDialogOpen] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [maxHeight, setMaxHeight] = useState<number>(0);

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

  useEffect(() => {
    const detailsElement = document.querySelector("#details");
    if (!detailsElement) return;
    const updateHeight = () => setMaxHeight(detailsElement.clientHeight - 69);
    updateHeight();

    const resizeObserver = new ResizeObserver(() => updateHeight());
    resizeObserver.observe(detailsElement);
    window.addEventListener("resize", updateHeight);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateHeight);
    };
  }, []);

  const sorted = useMemo(
    () => [...data].sort((a, b) => dayjs(b.date).valueOf() - dayjs(a.date).valueOf()),
    [data]
  );

  return (
    <>
      <div
        className="relative w-full overflow-auto overscroll-none px-3 py-2"
        style={{ scrollbarWidth: "none", maxHeight: `${maxHeight}px` }}
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

              const fee = trade.orderStatus === "FILLED" ? trade.feeFilled : trade.feeSettled;
              const isClosed =
                trade.orderStatus === "SETTLED" || trade.orderStatus === "LIQUIDATE";
              const hasPnl =
                (trade.orderStatus === "SETTLED" ||
                  trade.orderStatus === "LIQUIDATE" ||
                  trade.orderStatus === "FILLED") &&
                pnl !== 0;
              const canShowFundingInfo = isClosed;
              const showFee =
                trade.orderStatus !== "CANCELLED" &&
                trade.orderStatus !== "LIQUIDATE" &&
                trade.orderStatus !== "PENDING";

              // Zone 1: accent bar + badges
              const accentBar = trade.orderStatus === "LIQUIDATE"
                ? "bg-red/70"
                : trade.orderStatus === "SETTLED"
                  ? "bg-green-medium/70"
                  : trade.orderStatus === "CANCELLED"
                    ? "bg-gray-500/50"
                    : "bg-theme/60";

              const statusDot = trade.orderStatus === "LIQUIDATE"
                ? "bg-red"
                : trade.orderStatus === "SETTLED"
                  ? "bg-green-medium"
                  : trade.orderStatus === "CANCELLED"
                    ? "bg-gray-500"
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
                    : trade.orderStatus === "CANCELLED"
                      ? "bg-gray-500/10 text-gray-500/80"
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
              const feeLabel = showFee ? formatSatsMBtc(fee) : "—";
              const availLabel = BTC.format(
                new BTC("sats", Big(trade.availableMargin)).convert("BTC"),
                "BTC"
              );

              // Expanded: secondary details
              const posValueLabel = BTC.format(
                new BTC(
                  "sats",
                  Big(
                    Math.abs(
                      trade.positionSize / (trade.settlementPrice || trade.entryPrice || 1)
                    )
                  )
                ).convert("BTC"),
                "BTC"
              );
              const truncatedTxHash = trade.tx_hash ? truncateHash(trade.tx_hash) : null;

              return (
                <div
                  key={cardId}
                  className="group relative overflow-hidden rounded-xl border border-border/70 bg-background/90 shadow-sm transition-all duration-150 hover:-translate-y-[1px] hover:border-theme/35 hover:shadow-md"
                >
                  {/* Left accent bar */}
                  <div className={cn("absolute inset-y-0 left-0 w-0.5", accentBar)} />

                  <div className="px-3 py-2.5 pl-[14px]">
                    {/* Zone 1 — Identity */}
                    <div className="mb-1.5 flex items-center justify-between gap-2">
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

                    {/* Zone 2 — Price Story */}
                    <div className="mb-1.5 flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <div className="flex items-baseline gap-1">
                          <span className="text-[10px] uppercase tracking-wide text-primary/45">
                            Entry
                          </span>
                          <span className="text-sm font-semibold text-primary">{entryLabel}</span>
                        </div>
                        {closeLabel && (
                          <>
                            <span className="shrink-0 text-[11px] text-primary/30">→</span>
                            <div className="flex items-baseline gap-1">
                              <span className="text-[10px] uppercase tracking-wide text-primary/45">
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
                          <span className="text-[10px] uppercase tracking-wide text-primary/45">
                            PnL
                          </span>
                          <PnlCell pnlSats={pnl} btcPriceUsd={btcPriceUsd} />
                        </div>
                      )}
                    </div>

                    {/* Zone 3 — Cost Row (never wraps) */}
                    <div className="flex items-center gap-2 overflow-hidden text-[11px]">
                      <span className="shrink-0 text-primary/45">Notional</span>
                      <span className="shrink-0 font-medium text-primary/80">{notionalLabel}</span>
                      <span className="shrink-0 text-primary/25">•</span>
                      <span className="shrink-0 text-primary/45">Lev</span>
                      <span className="shrink-0 font-medium text-primary/80">{levLabel}</span>
                      <span className="shrink-0 text-primary/25">•</span>
                      <span className="shrink-0 text-primary/45">Fee</span>
                      <span className="shrink-0 font-medium text-primary/80">{feeLabel}</span>
                      <span className="shrink-0 text-primary/25">•</span>
                      <span className="shrink-0 text-primary/45">Avail</span>
                      <span className="shrink-0 font-medium text-primary/80">{availLabel}</span>
                      {canShowFundingInfo && (
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
                    <div className="mt-1.5 border-t border-border/30 pt-1">
                      <button
                        type="button"
                        onClick={() => toggleExpand(cardId)}
                        className="flex w-full items-center justify-between rounded py-0.5 text-[10px] uppercase tracking-wide text-primary/40 transition-colors duration-150 hover:bg-primary/5 hover:text-primary/60"
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
                            <span className="shrink-0 text-[10px] uppercase tracking-wide text-primary/45">
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
                            <span className="shrink-0 text-[10px] uppercase tracking-wide text-primary/45">
                              Type
                            </span>
                            <span className="font-medium">{trade.orderType}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="shrink-0 text-[10px] uppercase tracking-wide text-primary/45">
                              Pos. Value
                            </span>
                            <span className="font-medium">{posValueLabel}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="shrink-0 text-[10px] uppercase tracking-wide text-primary/45">
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
                              {formatSatsMBtc(funding)}
                            </span>
                          </div>
                          {truncatedTxHash &&
                            trade.orderStatus !== "CANCELLED" &&
                            trade.orderStatus !== "PENDING" && (
                              <div className="col-span-2 flex items-center gap-2">
                                <span className="shrink-0 text-[10px] uppercase tracking-wide text-primary/45">
                                  Tx Hash
                                </span>
                                <Link
                                  href={`${process.env.NEXT_PUBLIC_EXPLORER_URL as string}/txs/${trade.tx_hash}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="font-medium transition-colors hover:text-primary hover:underline"
                                >
                                  {truncatedTxHash}
                                </Link>
                              </div>
                            )}
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

export default OrderHistoryCards;
