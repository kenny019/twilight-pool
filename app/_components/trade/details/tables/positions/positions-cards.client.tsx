"use client";

import Button from "@/components/button";
import FundingHistoryDialog from "@/components/funding-history-dialog";
import cn from "@/lib/cn";
import { formatSatsMBtc } from "@/lib/helpers";
import { useSessionStore } from "@/lib/providers/session";
import { usePriceFeed } from "@/lib/providers/feed";
import { useLimitDialog } from "@/lib/providers/limit-dialogs";
import BTC from "@/lib/twilight/denoms";
import { TradeOrder } from "@/lib/types";
import { PnlCell } from "@/lib/components/pnl-display";
import Big from "big.js";
import dayjs from "dayjs";
import { Info } from "lucide-react";
import React, { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { calculateUpnl } from "../../../orderbook/my-trades/columns";

interface PositionsCardsProps {
  data: TradeOrder[];
  settleMarketOrder: (trade: TradeOrder, currentPrice: number) => Promise<void>;
  isSettlingOrder: (uuid: string) => boolean;
}

const PositionsCards = React.memo(function PositionsCards({
  data,
  settleMarketOrder,
  isSettlingOrder,
}: PositionsCardsProps) {
  const { openConditionalDialog } = useLimitDialog();
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
              const markPrice = getCurrentPrice() || trade.entryPrice;
              const positionSizeUsd = new BTC("sats", Big(trade.positionSize))
                .convert("BTC")
                .toFixed(2);
              const positionValue = new BTC(
                "sats",
                Big(Math.abs(trade.positionSize / markPrice))
              ).convert("BTC");
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
              const isSettling = isSettlingOrder(trade.uuid);

              const limitPrice = trade.settleLimit?.price
                ? `$${Number(trade.settleLimit.price).toFixed(2)}`
                : null;
              const slPrice = trade.stopLoss?.price
                ? `$${Number(trade.stopLoss.price).toFixed(2)}`
                : null;
              const tpPrice = trade.takeProfit?.price
                ? `$${Number(trade.takeProfit.price).toFixed(2)}`
                : null;

              return (
                <div
                  key={trade.uuid}
                  className="group rounded-xl border border-border/60 bg-gradient-to-b from-background to-background/80 p-4 shadow-[0_1px_0_rgba(255,255,255,0.05)_inset] transition-all duration-200 hover:-translate-y-[1px] hover:border-theme/30 hover:shadow-[0_8px_24px_rgba(0,0,0,0.22)]"
                >
                  <div className="mb-3 h-px w-full bg-gradient-to-r from-theme/40 via-theme/15 to-transparent opacity-70 transition-opacity duration-200 group-hover:opacity-100" />
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "rounded px-2 py-1 text-xs font-medium transition-colors duration-200",
                          trade.positionType === "LONG"
                            ? "bg-green-medium/10 text-green-medium"
                            : "bg-red/10 text-red"
                        )}
                      >
                        {trade.positionType}
                      </span>
                      <span className="text-[11px] text-primary/65">
                        {dayjs(trade.date).format("DD/MM/YYYY HH:mm:ss")}
                      </span>
                    </div>
                    <PnlCell pnlSats={calculatedUnrealizedPnl} btcPriceUsd={btcPriceUsd} />
                  </div>

                  <div className="mb-3 grid grid-cols-2 gap-2 rounded-lg border border-border/40 bg-theme/5 p-2">
                    <div>
                      <div className="text-[10px] uppercase tracking-wide text-primary/55">Entry / Mark</div>
                      <div className="text-sm font-semibold">
                        ${trade.entryPrice.toFixed(2)} / ${markPrice.toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-wide text-primary/55">Leverage</div>
                      <div className="text-sm font-semibold">{trade.leverage.toFixed(2)}x</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-x-4 gap-y-2 text-xs sm:grid-cols-2 lg:grid-cols-3">
                    <div>
                      <div className="text-[11px] uppercase tracking-wide text-primary/60">Position Size (USD)</div>
                      <div className="font-medium">${positionSizeUsd}</div>
                    </div>
                    <div>
                      <div className="text-[11px] uppercase tracking-wide text-primary/60">Position Value (BTC)</div>
                      <div className="font-medium">{BTC.format(positionValue, "BTC")}</div>
                    </div>
                    <div>
                      <div className="text-[11px] uppercase tracking-wide text-primary/60">Entry Price</div>
                      <div className="font-medium">${trade.entryPrice.toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-[11px] uppercase tracking-wide text-primary/60">Mark Price</div>
                      <div className="font-medium">${markPrice.toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-[11px] uppercase tracking-wide text-primary/60">Leverage</div>
                      <div className="font-medium">{trade.leverage.toFixed(2)}x</div>
                    </div>
                    <div>
                      <div className="text-[11px] uppercase tracking-wide text-primary/60">Liq. Price</div>
                      <div className="font-medium">${trade.liquidationPrice.toFixed(2)}</div>
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
                      <div className="text-[11px] uppercase tracking-wide text-primary/60">Maint. Margin</div>
                      <div className="font-medium">
                        {BTC.format(
                          new BTC("sats", Big(trade.maintenanceMargin)).convert("BTC"),
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
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] uppercase tracking-wide text-primary/60">Fee (mBTC)</div>
                      <div className="font-medium">{formatSatsMBtc(trade.feeFilled)}</div>
                    </div>
                  </div>

                  <div className="mt-3 border-t border-border/50 pt-3">
                    <div className="mb-2 text-[11px] uppercase tracking-wide text-primary/60">
                      Close Controls
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                    <Button
                      onClick={async (e) => {
                        e.preventDefault();
                        await settleMarketOrder(trade, getCurrentPrice());
                      }}
                      variant="ui"
                      size="small"
                      disabled={isSettling}
                      title="Close at market price"
                      className="transition-all duration-150 hover:brightness-110"
                    >
                      {isSettling ? "Closing..." : "Close MKT"}
                    </Button>
                    <Button
                      onClick={(e) => {
                        e.preventDefault();
                        openConditionalDialog(trade.accountAddress, "limit");
                      }}
                      variant="ui"
                      size="small"
                      disabled={isSettling}
                      className={cn(
                        "transition-all duration-150 hover:brightness-110",
                        limitPrice ? "border-yellow-400/40 text-yellow-400" : ""
                      )}
                    >
                      {limitPrice ? `Limit ${limitPrice}` : "Set Limit"}
                    </Button>
                    <Button
                      onClick={(e) => {
                        e.preventDefault();
                        openConditionalDialog(trade.accountAddress, "sltp");
                      }}
                      variant="ui"
                      size="small"
                      disabled={isSettling}
                      className={cn(
                        "transition-all duration-150 hover:brightness-110",
                        slPrice || tpPrice ? "border-theme/40 text-theme" : ""
                      )}
                    >
                      {slPrice && tpPrice
                        ? `SL ${slPrice} / TP ${tpPrice}`
                        : slPrice
                          ? `SL ${slPrice}`
                          : tpPrice
                            ? `TP ${tpPrice}`
                            : "Set SL / TP"}
                    </Button>
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

export default PositionsCards;
