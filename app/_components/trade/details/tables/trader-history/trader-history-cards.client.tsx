"use client";

import FundingHistoryDialog from "@/components/funding-history-dialog";
import cn from "@/lib/cn";
import { formatSatsMBtc, truncateHash } from "@/lib/helpers";
import { useToast } from "@/lib/hooks/useToast";
import { usePriceFeed } from "@/lib/providers/feed";
import { useSessionStore } from "@/lib/providers/session";
import BTC from "@/lib/twilight/denoms";
import { TradeOrder } from "@/lib/types";
import { PnlCell } from "@/lib/components/pnl-display";
import Big from "big.js";
import dayjs from "dayjs";
import { Info } from "lucide-react";
import React, { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";

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
  const [maxHeight, setMaxHeight] = useState<number>(0);

  const openFundingDialog = useCallback((trade: TradeOrder) => {
    setFundingDialogTrade(trade);
    setIsFundingDialogOpen(true);
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
        <div className="grid gap-3">
          {sorted.length === 0 ? (
            <div className="py-10 text-center text-sm text-primary-accent">No results.</div>
          ) : (
            sorted.map((trade) => {
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

              return (
                <div
                  key={`${trade.uuid}_${trade.date.toString()}`}
                  className="group rounded-xl border border-border/60 bg-gradient-to-b from-background to-background/80 p-4 shadow-[0_1px_0_rgba(255,255,255,0.05)_inset] transition-all duration-200 hover:-translate-y-[1px] hover:border-theme/30 hover:shadow-[0_8px_24px_rgba(0,0,0,0.22)]"
                >
                  <div className="mb-3 h-px w-full bg-gradient-to-r from-theme/40 via-theme/15 to-transparent opacity-70 transition-opacity duration-200 group-hover:opacity-100" />
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "rounded px-2 py-1 text-xs font-medium",
                          trade.positionType === "LONG"
                            ? "bg-green-medium/10 text-green-medium"
                            : "bg-red/10 text-red"
                        )}
                      >
                        {trade.positionType}
                      </span>
                      <span
                        className={cn(
                          "rounded px-2 py-1 text-xs font-medium",
                          trade.orderStatus === "SETTLED"
                            ? "bg-green-medium/10 text-green-medium"
                            : trade.orderStatus === "LIQUIDATE"
                              ? "bg-red/10 text-red"
                              : "bg-gray-500/10 text-gray-500"
                        )}
                      >
                        {trade.orderStatus}
                      </span>
                    </div>
                    <span className="text-[11px] text-primary/65">
                      {dayjs(trade.date).format("DD/MM/YYYY HH:mm:ss")}
                    </span>
                  </div>

                  <div className="mb-3 grid grid-cols-2 gap-2 rounded-lg border border-border/40 bg-theme/5 p-2">
                    <div>
                      <div className="text-[10px] uppercase tracking-wide text-primary/55">Status / Side</div>
                      <div className="text-sm font-semibold">
                        {trade.orderStatus} / {trade.positionType}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-wide text-primary/55">Realized PnL</div>
                      <PnlCell pnlSats={pnl} btcPriceUsd={btcPriceUsd} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-x-4 gap-y-2 text-xs sm:grid-cols-2 lg:grid-cols-3">
                    <div>
                      <div className="text-[11px] uppercase tracking-wide text-primary/60">Order ID</div>
                      <button
                        type="button"
                        className="font-medium transition-colors hover:text-primary hover:underline"
                        onClick={() => {
                          navigator.clipboard.writeText(trade.uuid);
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
                      <div className="text-[11px] uppercase tracking-wide text-primary/60">Pos. Size (USD)</div>
                      <div className="font-medium">
                        $
                        {new BTC("sats", Big(trade.positionSize))
                          .convert("BTC")
                          .toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] uppercase tracking-wide text-primary/60">Pos. Value (BTC)</div>
                      <div className="font-medium">
                        {BTC.format(
                          new BTC(
                            "sats",
                            Big(Math.abs(trade.positionSize / (trade.settlementPrice || trade.entryPrice)))
                          ).convert("BTC"),
                          "BTC"
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] uppercase tracking-wide text-primary/60">Entry Price</div>
                      <div className="font-medium">${trade.entryPrice.toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-[11px] uppercase tracking-wide text-primary/60">Settlement Price</div>
                      <div className="font-medium">
                        {trade.orderStatus === "SETTLED" || trade.orderStatus === "LIQUIDATE"
                          ? `$${trade.settlementPrice.toFixed(2)}`
                          : "—"}
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] uppercase tracking-wide text-primary/60">Liq. Price</div>
                      <div className="font-medium">
                        {trade.liquidationPrice ? `$${trade.liquidationPrice.toFixed(2)}` : "—"}
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] uppercase tracking-wide text-primary/60">PnL</div>
                      <PnlCell pnlSats={pnl} btcPriceUsd={btcPriceUsd} />
                    </div>
                    <div>
                      <div className="text-[11px] uppercase tracking-wide text-primary/60">Avail. Margin</div>
                      <div className="font-medium">
                        {BTC.format(
                          new BTC("sats", Big(trade.availableMargin)).convert("BTC"),
                          "BTC"
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] uppercase tracking-wide text-primary/60">Funding (mBTC)</div>
                      <div className="flex items-center gap-1.5">
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
                        {(trade.orderStatus === "SETTLED" ||
                          trade.orderStatus === "LIQUIDATE") && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              openFundingDialog(trade);
                            }}
                            className="rounded p-0.5 text-primary-accent/40 transition-all duration-150 hover:scale-105 hover:bg-theme/20 hover:text-primary-accent"
                            aria-label="View funding history"
                          >
                            <Info className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] uppercase tracking-wide text-primary/60">Fee (mBTC)</div>
                      <div className="font-medium">
                        {formatSatsMBtc(
                          trade.orderStatus === "FILLED" ? trade.feeFilled : trade.feeSettled
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
