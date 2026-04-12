"use client";

import { EmptyState } from "@/components/empty-state";
import FundingHistoryDialog from "@/components/funding-history-dialog";
import cn from "@/lib/cn";
import { formatSatsMBtc, truncateHash } from "@/lib/helpers";
import { useToast } from "@/lib/hooks/useToast";
import { PnlCell } from "@/lib/components/pnl-display";
import { usePriceFeed } from "@/lib/providers/feed";
import { useSessionStore } from "@/lib/providers/session";
import { TradeOrder } from "@/lib/types";
import dayjs from "dayjs";
import { ChevronDown, ChevronUp, Info } from "lucide-react";
import Link from "next/link";
import React, {
  useCallback,
  useState,
  useSyncExternalStore,
} from "react";
import {
  getOrderHistoryFee,
  getOrderHistoryFunding,
  getOrderHistoryPnl,
  getTimelineEventTitle,
  OrderHistoryGroup,
  PRICE_KIND_LABELS,
} from "./grouped-order-history";

interface OrderHistoryCardsProps {
  data: OrderHistoryGroup[];
}

function getSideClasses(side: string): string {
  return side === "LONG"
    ? "bg-green-medium/10 text-green-medium"
    : "bg-red/10 text-red";
}

function getLifecycleClasses(lifecycle: string): string {
  switch (lifecycle) {
    case "SETTLED":
      return "bg-green-medium/10 text-green-medium";
    case "LIQUIDATE":
      return "bg-red/10 text-red";
    case "CANCELLED":
      return "bg-gray-500/10 text-gray-400";
    case "FILLED":
      return "bg-theme/10 text-theme";
    case "PENDING":
      return "bg-primary/10 text-primary/70";
    default:
      return "bg-gray-500/10 text-gray-400";
  }
}

function getTimelineBadgeClasses(): string {
  return "border border-border/50 bg-background text-primary/60";
}

function copyValue(value: string, label: string) {
  navigator.clipboard.writeText(value);
  return `${label} copied to clipboard`;
}

function MetadataItem({
  label,
  value,
  className,
  labelClassName,
  valueClassName,
}: {
  label: string;
  value: React.ReactNode;
  className?: string;
  labelClassName?: string;
  valueClassName?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-0.5", className)}>
      <span
        className={cn(
          "text-[10px] uppercase tracking-wide text-primary/40",
          labelClassName
        )}
      >
        {label}
      </span>
      <div className={cn("text-[11px] text-primary/85", valueClassName)}>
        {value}
      </div>
    </div>
  );
}

function TimelineItem({
  trade,
  btcPriceUsd,
  openFundingDialog,
  toastMessage,
  isLast,
}: {
  trade: TradeOrder;
  btcPriceUsd: number;
  openFundingDialog: (trade: TradeOrder) => void;
  toastMessage: (label: string, value: string) => void;
  isLast: boolean;
}) {
  const eventTitle = getTimelineEventTitle(trade);
  const fee = getOrderHistoryFee(trade);
  const funding = getOrderHistoryFunding(trade);
  const pnl = getOrderHistoryPnl(trade);
  const showClose =
    trade.orderStatus === "SETTLED" || trade.orderStatus === "LIQUIDATE";
  const triggerPrice =
    trade.displayPrice != null &&
    trade.priceKind &&
    trade.priceKind !== "NONE"
      ? {
          label: PRICE_KIND_LABELS[trade.priceKind] ?? "Trigger",
          value: `$${trade.displayPrice.toFixed(2)}`,
        }
      : null;

  const hasDetails =
    showClose ||
    triggerPrice ||
    pnl != null ||
    fee != null ||
    funding != null ||
    trade.tx_hash ||
    trade.request_id ||
    trade.reason;

  return (
    <div className="relative pl-4">
      {!isLast && (
        <div className="bg-border/50 absolute bottom-0 left-[4px] top-2.5 w-px" />
      )}
      <div className="bg-border/70 absolute left-0 top-2 h-2 w-2 rounded-full" />

      <div className="border-border/50 rounded-lg border bg-background/70 px-2.5 py-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <span
              className={cn(
                "rounded px-1.5 py-0.5 text-[10px] font-medium",
                getTimelineBadgeClasses()
              )}
            >
              {eventTitle}
            </span>
            <span className="text-[11px] font-medium text-primary/70">
              {trade.orderType}
            </span>
          </div>
          <span className="text-[11px] text-primary/55 tabular-nums">
            {dayjs(trade.date).format("DD MMM HH:mm:ss")}
          </span>
        </div>

        {hasDetails && (
          <div className="mt-1.5 grid grid-cols-2 gap-x-3.5 gap-y-1.5">
            {showClose && (
              <MetadataItem
                label="Close"
                value={
                  <span className="font-medium">
                    ${trade.settlementPrice.toFixed(2)}
                  </span>
                }
              />
            )}
            {triggerPrice && (
              <MetadataItem
                label={triggerPrice.label}
                value={
                  <span className="font-medium">{triggerPrice.value}</span>
                }
              />
            )}
            {pnl != null && (
              <MetadataItem
                label="PnL"
                value={
                  <PnlCell
                    pnlSats={pnl}
                    btcPriceUsd={btcPriceUsd}
                    layout="inline"
                  />
                }
              />
            )}
            {fee != null && (
              <MetadataItem
                label="Fee"
                value={
                  <span className="font-medium">{formatSatsMBtc(fee)}</span>
                }
              />
            )}
            {funding != null && (
              <MetadataItem
                label="Funding"
                value={
                  <span className="inline-flex items-center gap-1.5 font-medium">
                    <span>{formatSatsMBtc(funding)}</span>
                    {(trade.orderStatus === "SETTLED" ||
                      trade.orderStatus === "LIQUIDATE") && (
                      <button
                        type="button"
                        onClick={() => openFundingDialog(trade)}
                        className="rounded p-0.5 text-primary/40 transition-colors hover:bg-primary/5 hover:text-primary/60"
                        aria-label="View funding history"
                      >
                        <Info className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </span>
                }
              />
            )}
            {trade.tx_hash && (
              <MetadataItem
                label="Tx Hash"
                value={
                  <Link
                    href={`${process.env.NEXT_PUBLIC_EXPLORER_URL as string}/txs/${trade.tx_hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium hover:underline"
                  >
                    {truncateHash(trade.tx_hash)}
                  </Link>
                }
              />
            )}
            {trade.request_id && (
              <MetadataItem
                label="Request ID"
                value={
                  <button
                    type="button"
                    onClick={() => toastMessage("Request ID", trade.request_id!)}
                    className="font-medium hover:underline"
                  >
                    {truncateHash(trade.request_id, 4, 4)}
                  </button>
                }
              />
            )}
            {trade.reason && (
              <MetadataItem
                label="Reason"
                className="col-span-2"
                value={
                  <span className="text-primary/70">{trade.reason}</span>
                }
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const OrderHistoryCards = React.memo(function OrderHistoryCards({
  data,
}: OrderHistoryCardsProps) {
  const { toast } = useToast();
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

  const showCopyToast = useCallback(
    (label: string, value: string) => {
      toast({
        title: "Copied to clipboard",
        description: copyValue(value, label),
      });
    },
    [toast]
  );

  return (
    <>
      <div className="relative w-full overscroll-none px-3 py-2">
        <div className="grid grid-cols-1 gap-2.5 xl:grid-cols-2">
          {data.length === 0 ? (
            <EmptyState title="No order history." />
          ) : (
            data.map((group) => {
              const isExpanded = expandedIds.has(group.uuid);

              return (
                <div
                  key={group.uuid}
                  className="border-border/70 rounded-xl border bg-background/90 shadow-sm"
                >
                  <div className="px-3 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex min-w-0 items-center gap-1.5">
                          <span
                            className={cn(
                              "rounded px-1.5 py-0.5 text-[11px] font-semibold",
                              getSideClasses(group.parentSide)
                            )}
                          >
                            {group.parentSide}
                          </span>
                          <span className="truncate text-[11px] font-medium text-primary/75">
                            {group.parentType}
                          </span>
                        </div>
                        <div className="mt-1 text-[11px] text-primary/55 tabular-nums">
                          {dayjs(group.latestDate).format("DD MMM YYYY HH:mm:ss")}
                        </div>
                      </div>

                      <span
                        className={cn(
                          "rounded px-2 py-1 text-[11px] font-medium",
                          getLifecycleClasses(group.lifecycleValue)
                        )}
                      >
                        {group.lifecycleLabel}
                      </span>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2">
                      <MetadataItem
                        label="Entry"
                        value={
                          <span className="text-sm font-semibold">
                            ${group.parentEntryPrice.toFixed(2)}
                          </span>
                        }
                      />
                      <MetadataItem
                        label={group.closeOrTriggerLabel ?? "Close / Trigger"}
                        value={
                          group.closeOrTriggerValue != null ? (
                            <span className="text-sm font-semibold">
                              ${group.closeOrTriggerValue.toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-sm text-primary/40">—</span>
                          )
                        }
                      />
                      {group.terminalRow && (
                        <MetadataItem
                          label="PnL"
                          className="col-span-2"
                          value={
                            <PnlCell
                              pnlSats={getOrderHistoryPnl(group.terminalRow)}
                              btcPriceUsd={btcPriceUsd}
                              layout="inline"
                            />
                          }
                        />
                      )}
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
                      {group.latestEventValue !== group.lifecycleValue && (
                        <>
                          <span className="text-primary/40">Latest Event</span>
                          <span className="font-medium text-primary/75">
                            {group.latestEventLabel}
                          </span>
                          <span className="text-primary/25">&bull;</span>
                        </>
                      )}
                      <span className="text-primary/40">Lev</span>
                      <span className="font-medium text-primary/75">
                        {group.parentLeverage.toFixed(2)}x
                      </span>
                    </div>

                    <div className="border-border/30 mt-2.5 border-t pt-1.5">
                      <button
                        type="button"
                        onClick={() => toggleExpand(group.uuid)}
                        className="flex min-h-[44px] w-full items-center justify-between rounded px-0.5 py-2 text-[10px] uppercase tracking-wide text-primary/40 transition-colors duration-150 hover:bg-primary/5 hover:text-primary/60"
                      >
                        <span>Details</span>
                        {isExpanded ? (
                          <ChevronUp className="h-3 w-3" />
                        ) : (
                          <ChevronDown className="h-3 w-3" />
                        )}
                      </button>

                      {isExpanded && (
                        <div className="mt-1.5 space-y-2.5">
                          <div className="flex items-center gap-2 text-[11px]">
                            <span className="text-[10px] uppercase tracking-wide text-primary/40">
                              Order ID
                            </span>
                            <button
                              type="button"
                              onClick={() => showCopyToast("Order ID", group.uuid)}
                              className="font-medium hover:underline"
                            >
                              {truncateHash(group.uuid, 4, 4)}
                            </button>
                          </div>

                          <div className="space-y-2.5">
                            {group.rows.map((trade, index) => (
                              <TimelineItem
                                key={
                                  trade.idempotency_key ??
                                  `${trade.uuid}_${trade.orderStatus}_${trade.date.toString()}`
                                }
                                trade={trade}
                                btcPriceUsd={btcPriceUsd}
                                openFundingDialog={openFundingDialog}
                                toastMessage={showCopyToast}
                                isLast={index === group.rows.length - 1}
                              />
                            ))}
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

export default OrderHistoryCards;
