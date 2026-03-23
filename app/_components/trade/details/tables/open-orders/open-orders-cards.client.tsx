"use client";

import Button from "@/components/button";
import cn from "@/lib/cn";
import { capitaliseFirstLetter, formatSatsCompact, truncateHash } from "@/lib/helpers";
import { useToast } from "@/lib/hooks/useToast";
import { useLimitDialog } from "@/lib/providers/limit-dialogs";
import { usdNumberFormatter } from "@/lib/utils/format";
import BTC from "@/lib/twilight/denoms";
import { TradeOrder } from "@/lib/types";
import Big from "big.js";
import dayjs from "dayjs";
import React, { useEffect, useMemo, useState } from "react";
import { OpenOrderRow } from "../../details.client";

interface OpenOrdersCardsProps {
  data: OpenOrderRow[];
  cancelOrder: (
    order: TradeOrder,
    options?: { sl_bool?: boolean; tp_bool?: boolean }
  ) => Promise<void>;
  openEditDialog: (order: TradeOrder) => void;
  isCancellingOrder: (uuid: string) => boolean;
}

function getOpenOrderTimestamp(row: OpenOrderRow): number {
  if (row._sltpLeg === "sl") {
    return row.stopLoss?.created_time
      ? dayjs(row.stopLoss.created_time).valueOf()
      : dayjs(row.date).valueOf();
  }
  if (row._sltpLeg === "tp") {
    return row.takeProfit?.created_time
      ? dayjs(row.takeProfit.created_time).valueOf()
      : dayjs(row.date).valueOf();
  }
  const ts =
    row.settleLimit?.created_time ??
    row.takeProfit?.created_time ??
    row.stopLoss?.created_time;
  return ts ? dayjs(ts).valueOf() : dayjs(row.date).valueOf();
}

function getTypePill(row: OpenOrderRow) {
  if (row._sltpLeg === "sl") {
    return { label: "Stop Loss", className: "bg-red/10 text-red" };
  }
  if (row._sltpLeg === "tp") {
    return { label: "Take Profit", className: "bg-green-medium/10 text-green-medium" };
  }
  if (row.settleLimit) {
    return { label: "Close", className: "bg-yellow-500/10 text-yellow-500" };
  }
  return { label: "Open", className: "bg-primary-accent/10 text-primary-accent" };
}

const OpenOrdersCards = React.memo(function OpenOrdersCards({
  data,
  cancelOrder,
  openEditDialog,
  isCancellingOrder,
}: OpenOrdersCardsProps) {
  const { toast } = useToast();
  const { openConditionalDialog } = useLimitDialog();
  const [maxHeight, setMaxHeight] = useState<number>(0);

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
    () => [...data].sort((a, b) => getOpenOrderTimestamp(b) - getOpenOrderTimestamp(a)),
    [data]
  );

  return (
    <div
      className="relative w-full overflow-auto overscroll-none px-3 py-2"
      style={{ scrollbarWidth: "none", maxHeight: `${maxHeight}px` }}
    >
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        {sorted.length === 0 ? (
          <div className="py-10 text-center text-sm text-primary-accent">No results.</div>
        ) : (
          sorted.map((trade) => {
            const isCancelling = isCancellingOrder(trade.uuid);
            const uuid = trade._sltpLeg
              ? trade.uuid
              : trade.settleLimit?.uuid ?? trade.uuid;
            const truncatedUuid = truncateHash(uuid, 4, 4);
            const side =
              !trade._sltpLeg && trade.settleLimit
                ? trade.settleLimit.position_type
                : trade.positionType;
            const positionSizeRaw = new BTC("sats", Big(trade.positionSize))
              .convert("BTC")
              .toFixed(2);
            const positionSize = usdNumberFormatter.format(
              Number.parseFloat(positionSizeRaw) || 0
            );
            const triggerPrice = (() => {
              if (trade._sltpLeg === "sl" && trade.stopLoss) {
                const p = parseFloat(trade.stopLoss.price);
                return isFinite(p) ? `$${usdNumberFormatter.format(p)}` : "—";
              }
              if (trade._sltpLeg === "tp" && trade.takeProfit) {
                const p = parseFloat(trade.takeProfit.price);
                return isFinite(p) ? `$${usdNumberFormatter.format(p)}` : "—";
              }
              const p = trade.settleLimit ? Number(trade.settleLimit.price) : trade.entryPrice;
              return `$${isFinite(p) ? usdNumberFormatter.format(p) : "—"}`;
            })();
            const pill = getTypePill(trade);
            const timestamp = dayjs(getOpenOrderTimestamp(trade)).format(
              "DD MMM HH:mm:ss"
            );
            const statusColor =
              trade.orderStatus === "PENDING"
                ? "bg-yellow-400"
                : trade.orderStatus === "FILLED"
                  ? "bg-green-medium"
                  : "bg-theme";
            const shouldShowOrderType = !trade._sltpLeg && !trade.settleLimit;

            return (
              <div
                key={`${trade.uuid}_${trade._sltpLeg ?? "base"}`}
                className="group relative overflow-hidden rounded-xl border border-border/70 bg-background/90 shadow-sm transition-all duration-150 hover:-translate-y-[1px] hover:border-theme/35 hover:shadow-md"
              >
                <div
                  className={cn(
                    "absolute inset-y-0 left-0 w-0.5",
                    trade._sltpLeg === "sl"
                      ? "bg-red/70"
                      : trade._sltpLeg === "tp"
                        ? "bg-green-medium/70"
                        : "bg-theme/60"
                  )}
                />

                <div className="px-3 py-2.5 pl-[14px] max-md:px-3 max-md:py-3">
                  {/* Header: badges + timestamp */}
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={cn(
                          "rounded px-1.5 py-0.5 text-[11px] font-semibold",
                          side === "LONG"
                            ? "bg-green-medium/10 text-green-medium"
                            : "bg-red/10 text-red"
                        )}
                      >
                        {side}
                      </span>
                      <span
                        className={cn(
                          "rounded px-1.5 py-0.5 text-[11px] font-semibold",
                          pill.className
                        )}
                      >
                        {pill.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-primary/55">
                      <span className="tabular-nums">{timestamp}</span>
                      <span className={cn("h-1.5 w-1.5 rounded-full", statusColor)} />
                    </div>
                  </div>

                  {/* Trigger / Notional / Lev — mobile: grid; desktop: inline */}
                  <div className="mb-2 grid grid-cols-3 gap-y-1 md:hidden">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] uppercase tracking-wide text-gray-500">
                        Trigger
                      </span>
                      <span className="text-sm font-semibold tabular-nums text-primary">
                        {triggerPrice}
                      </span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] uppercase tracking-wide text-gray-500">
                        Notional
                      </span>
                      <span className="text-sm font-semibold tabular-nums text-primary">
                        ${positionSize}
                      </span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] uppercase tracking-wide text-gray-500">
                        Leverage
                      </span>
                      <span className="text-sm font-semibold tabular-nums text-primary">
                        {trade.leverage.toFixed(1)}x
                      </span>
                    </div>
                  </div>
                  <div className="mb-1.5 hidden flex-wrap items-center gap-x-4 gap-y-1.5 text-xs md:flex">
                    <span className="text-gray-500">Trigger</span>
                    <span className="text-base font-semibold leading-none text-primary">
                      {triggerPrice}
                    </span>
                    <span className="text-primary/35">•</span>
                    <span className="text-gray-500">Notional</span>
                    <span className="font-medium text-primary/80">${positionSize}</span>
                    <span className="text-primary/35">•</span>
                    <span className="text-gray-500">Lev</span>
                    <span className="font-medium text-primary/80">
                      {trade.leverage.toFixed(1)}x
                    </span>
                  </div>

                  {/* Order ID / Avail / Type — mobile: grid; desktop: inline */}
                  <div className="mb-2 grid grid-cols-2 gap-x-4 gap-y-2 md:hidden">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] uppercase tracking-wide text-gray-500">
                        Order ID
                      </span>
                      <button
                        type="button"
                        className="w-fit rounded text-sm font-medium transition-colors duration-150 hover:text-primary hover:underline"
                        onClick={() => {
                          navigator.clipboard.writeText(uuid);
                          toast({
                            title: "Copied to clipboard",
                            description: `Order ID ${truncatedUuid} copied to clipboard`,
                          });
                        }}
                      >
                        {truncatedUuid}
                      </button>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] uppercase tracking-wide text-gray-500">
                        Avail
                      </span>
                      <span className="text-sm font-medium">
                        {formatSatsCompact(trade.availableMargin)}
                      </span>
                    </div>
                    {shouldShowOrderType && (
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] uppercase tracking-wide text-gray-500">
                          Type
                        </span>
                        <span className="text-sm font-medium">
                          {capitaliseFirstLetter(trade.orderType)}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="hidden flex-wrap items-center gap-x-4 gap-y-1 text-[11px] md:flex">
                    <span className="text-[10px] uppercase tracking-wide text-gray-500">
                      Order ID
                    </span>
                    <button
                      type="button"
                      className="rounded font-medium transition-colors duration-150 hover:text-primary hover:underline"
                      onClick={() => {
                        navigator.clipboard.writeText(uuid);
                        toast({
                          title: "Copied to clipboard",
                          description: `Order ID ${truncatedUuid} copied to clipboard`,
                        });
                      }}
                    >
                      {truncatedUuid}
                    </button>
                    <span className="text-primary/30">•</span>
                    <span className="text-[10px] uppercase tracking-wide text-gray-500">
                      Avail
                    </span>
                    <span className="font-medium">
                      {formatSatsCompact(trade.availableMargin)}
                    </span>
                    {shouldShowOrderType && (
                      <>
                        <span className="text-primary/30">•</span>
                        <span className="text-[10px] uppercase tracking-wide text-gray-500">
                          Type
                        </span>
                        <span className="font-medium">
                          {capitaliseFirstLetter(trade.orderType)}
                        </span>
                      </>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="mt-2 border-t border-border/50 pt-2">
                    <div className="flex items-center justify-end gap-2 max-md:justify-stretch">
                      <Button
                        onClick={async (e) => {
                          e.preventDefault();
                          if (trade._sltpLeg === "sl") {
                            await cancelOrder(trade, { sl_bool: true, tp_bool: false });
                            return;
                          }
                          if (trade._sltpLeg === "tp") {
                            await cancelOrder(trade, { sl_bool: false, tp_bool: true });
                            return;
                          }
                          await cancelOrder(trade);
                        }}
                        variant="ui"
                        size="small"
                        disabled={isCancelling}
                        className="h-7 px-2.5 text-[11px] font-medium transition-all duration-150 hover:border-red/30 hover:text-red/90 hover:brightness-110 max-md:h-10 max-md:flex-1 max-md:text-[13px]"
                      >
                        {isCancelling ? "Removing..." : "Remove"}
                      </Button>
                      {trade._sltpLeg && (
                        <Button
                          variant="ui"
                          size="small"
                          disabled={isCancelling}
                          onClick={(e) => {
                            e.preventDefault();
                            openConditionalDialog(trade.accountAddress, "sltp");
                          }}
                          className="h-7 px-2.5 text-[11px] transition-all duration-150 hover:brightness-110 max-md:h-10 max-md:flex-1 max-md:text-[13px]"
                        >
                          Edit
                        </Button>
                      )}
                      {!trade._sltpLeg && !!trade.settleLimit && (
                        <Button
                          variant="ui"
                          size="small"
                          disabled={isCancelling}
                          onClick={(e) => {
                            e.preventDefault();
                            openEditDialog(trade);
                          }}
                          className="h-7 px-2.5 text-[11px] transition-all duration-150 hover:brightness-110 max-md:h-10 max-md:flex-1 max-md:text-[13px]"
                        >
                          Edit
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
});

export default OpenOrdersCards;
