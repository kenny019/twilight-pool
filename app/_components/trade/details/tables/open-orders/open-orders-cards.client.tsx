"use client";

import Button from "@/components/button";
import cn from "@/lib/cn";
import { capitaliseFirstLetter, truncateHash } from "@/lib/helpers";
import { useToast } from "@/lib/hooks/useToast";
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
    return { label: "SL", className: "bg-red/10 text-red" };
  }
  if (row._sltpLeg === "tp") {
    return { label: "TP", className: "bg-green-medium/10 text-green-medium" };
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
      <div className="grid gap-3">
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
            const positionSize = new BTC("sats", Big(trade.positionSize))
              .convert("BTC")
              .toFixed(2);
            const priceLabel = (() => {
              if (trade._sltpLeg === "sl" && trade.stopLoss) {
                const p = parseFloat(trade.stopLoss.price);
                return isFinite(p) ? `SL $${p.toFixed(2)}` : "SL —";
              }
              if (trade._sltpLeg === "tp" && trade.takeProfit) {
                const p = parseFloat(trade.takeProfit.price);
                return isFinite(p) ? `TP $${p.toFixed(2)}` : "TP —";
              }
              const p = trade.settleLimit ? Number(trade.settleLimit.price) : trade.entryPrice;
              return `$${isFinite(p) ? p.toFixed(2) : "—"}`;
            })();
            const pill = getTypePill(trade);
            const timestamp = dayjs(getOpenOrderTimestamp(trade)).format(
              "DD/MM/YYYY HH:mm:ss"
            );

            return (
              <div
                key={`${trade.uuid}_${trade._sltpLeg ?? "base"}`}
                className="group rounded-xl border border-border/60 bg-gradient-to-b from-background to-background/80 p-4 shadow-[0_1px_0_rgba(255,255,255,0.05)_inset] transition-all duration-200 hover:-translate-y-[1px] hover:border-theme/30 hover:shadow-[0_8px_24px_rgba(0,0,0,0.22)]"
              >
                <div className="mb-3 h-px w-full bg-gradient-to-r from-theme/40 via-theme/15 to-transparent opacity-70 transition-opacity duration-200 group-hover:opacity-100" />
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "rounded px-2 py-1 text-xs font-medium transition-colors duration-200",
                        side === "LONG"
                          ? "bg-green-medium/10 text-green-medium"
                          : "bg-red/10 text-red"
                      )}
                    >
                      {capitaliseFirstLetter(side)}
                    </span>
                    <span
                      className={cn(
                        "rounded px-2 py-1 text-xs font-medium transition-colors duration-200",
                        pill.className
                      )}
                    >
                      {pill.label}
                    </span>
                    <span className="text-[11px] text-primary/65">
                      {capitaliseFirstLetter(trade.orderType)}
                    </span>
                  </div>
                  <span className="text-[11px] text-primary/65">{timestamp}</span>
                </div>

                <div className="mb-3 grid grid-cols-2 gap-2 rounded-lg border border-border/40 bg-theme/5 p-2">
                  <div>
                    <div className="text-[10px] uppercase tracking-wide text-primary/55">Trigger Price</div>
                    <div className="text-sm font-semibold">{priceLabel}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wide text-primary/55">Position Size</div>
                    <div className="text-sm font-semibold">${positionSize}</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-x-4 gap-y-2 text-xs sm:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <div className="text-[11px] uppercase tracking-wide text-primary/60">Order ID</div>
                    <button
                      type="button"
                      className="font-medium transition-colors hover:text-primary hover:underline"
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
                  <div>
                    <div className="text-[11px] uppercase tracking-wide text-primary/60">Price</div>
                    <div className="font-medium">{priceLabel}</div>
                  </div>
                  <div>
                    <div className="text-[11px] uppercase tracking-wide text-primary/60">Position Size (USD)</div>
                    <div className="font-medium">${positionSize}</div>
                  </div>
                  <div>
                    <div className="text-[11px] uppercase tracking-wide text-primary/60">Leverage</div>
                    <div className="font-medium">{trade.leverage.toFixed(2)}x</div>
                  </div>
                  <div>
                    <div className="text-[11px] uppercase tracking-wide text-primary/60">Avail. Margin (BTC)</div>
                    <div className="font-medium">
                      {BTC.format(
                        new BTC("sats", Big(trade.availableMargin)).convert("BTC"),
                        "BTC"
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-3 border-t border-border/50 pt-3">
                  <div className="mb-2 text-[11px] uppercase tracking-wide text-primary/60">
                    Actions
                  </div>
                  <div className="flex items-center gap-2">
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
                    className="transition-all duration-150 hover:brightness-110"
                  >
                    {isCancelling ? "Cancelling..." : "Cancel"}
                  </Button>
                  {!trade._sltpLeg && !!trade.settleLimit && (
                    <Button
                      variant="ui"
                      size="small"
                      disabled={isCancelling}
                      onClick={(e) => {
                        e.preventDefault();
                        openEditDialog(trade);
                      }}
                      className="transition-all duration-150 hover:brightness-110"
                    >
                      Edit
                    </Button>
                  )}
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
