"use client";

import Button from "@/components/button";
import FundingHistoryDialog from "@/components/funding-history-dialog";
import cn from "@/lib/cn";
import { formatSatsCompact, formatSatsMBtc } from "@/lib/helpers";
import { usdNumberFormatter } from "@/lib/utils/format";
import { useSessionStore } from "@/lib/providers/session";
import { usePriceFeed } from "@/lib/providers/feed";
import { useLimitDialog } from "@/lib/providers/limit-dialogs";
import BTC from "@/lib/twilight/denoms";
import { TradeOrder } from "@/lib/types";
import { PnlCell } from "@/lib/components/pnl-display";
import Big from "big.js";
import dayjs from "dayjs";
import { ChevronDown, ChevronUp, Info } from "lucide-react";
import { RemoveOrdersDropdown } from "./remove-orders-dropdown";
import React, {
  useCallback,
  useEffect,
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
    () =>
      [...data].sort(
        (a, b) => dayjs(b.date).valueOf() - dayjs(a.date).valueOf()
      ),
    [data]
  );

  return (
    <>
      <div
        className="relative w-full overflow-auto overscroll-none px-3 py-2"
        style={{ scrollbarWidth: "none", maxHeight: `${maxHeight}px` }}
      >
        <div className="grid grid-cols-1 gap-2.5">
          {sorted.length === 0 ? (
            <div className="py-10 text-center text-sm text-primary-accent">
              No results.
            </div>
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

              // Zone 1
              const accentBar =
                trade.positionType === "LONG"
                  ? "bg-green-medium/70"
                  : "bg-red/70";
              const sideClass =
                trade.positionType === "LONG"
                  ? "bg-green-medium/10 text-green-medium"
                  : "bg-red/10 text-red";

              // Zone 2
              const entryLabel = `$${usdNumberFormatter.format(trade.entryPrice)}`;
              const markLabel = `$${usdNumberFormatter.format(markPrice)}`;
              const hasPnl = calculatedUnrealizedPnl !== 0;

              // Zone 3: risk row (never wraps)
              const notionalLabel = `$${usdNumberFormatter.format(
                Number(
                  new BTC("sats", Big(trade.positionSize))
                    .convert("BTC")
                    .toFixed(2)
                ) || 0
              )}`;
              const levLabel = `${trade.leverage.toFixed(1)}x`;
              const liqLabel = `$${usdNumberFormatter.format(trade.liquidationPrice)}`;

              // Zone 3b: conditional anchors
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

              // Expanded secondary details
              const positionValue = new BTC(
                "sats",
                Big(Math.abs(trade.positionSize / markPrice))
              ).convert("BTC");
              const availLabel = formatSatsCompact(trade.availableMargin);
              const maintLabel = formatSatsCompact(trade.maintenanceMargin);

              return (
                <div
                  key={trade.uuid}
                  className="border-border/70 hover:border-theme/35 group relative overflow-hidden rounded-xl border bg-background/90 shadow-sm transition-all duration-150 hover:-translate-y-[1px] hover:shadow-md"
                >
                  {/* Left accent bar — direction-coded */}
                  <div
                    className={cn("absolute inset-y-0 left-0 w-0.5", accentBar)}
                  />

                  <div className="px-3 py-2.5 pl-[14px]">
                    {/* Main content: left = position + actions, right = time + anchors */}
                    <div className="mb-2 flex items-start gap-4">
                      <div className="min-w-0 flex-1">
                        {/* Row 1 — Position state */}
                        <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-1.5">
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                "rounded px-1.5 py-0.5 text-xs font-semibold",
                                sideClass
                              )}
                            >
                              {trade.positionType}
                            </span>
                            <span className="h-1.5 w-1.5 rounded-full bg-green-medium" />
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-primary/45 text-[10px] uppercase tracking-wide">
                              Entry
                            </span>
                            <span className="text-base font-semibold text-primary">
                              {entryLabel}
                            </span>
                            <span className="text-xs text-primary/30">→</span>
                            <span className="text-primary/45 text-[10px] uppercase tracking-wide">
                              Mark
                            </span>
                            <span className="text-base font-semibold text-primary">
                              {markLabel}
                            </span>
                            {hasPnl && (
                              <>
                                <span className="text-primary/25">·</span>
                                <PnlCell
                                  pnlSats={calculatedUnrealizedPnl}
                                  btcPriceUsd={btcPriceUsd}
                                  className="text-sm font-semibold"
                                />
                              </>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-primary/45 font-medium">
                              Notional
                            </span>
                            <span className="font-semibold text-primary">
                              {notionalLabel}
                            </span>
                            <span className="text-primary/25">•</span>
                            <span className="text-primary/45 font-medium">
                              Exposure
                            </span>
                            <span className="font-semibold text-primary">
                              {formatSatsCompact(
                                Math.round(
                                  positionValue.mul(100_000_000).toNumber()
                                )
                              )}
                            </span>
                            <span className="text-primary/25">•</span>
                            <span className="text-primary/45 font-medium">
                              Leverage
                            </span>
                            <span className="font-semibold text-primary">
                              {levLabel}
                            </span>
                            <span className="text-primary/25">•</span>
                            <span className="text-primary/45 font-medium">
                              Liquidation
                            </span>
                            <span className="font-semibold text-primary">
                              {liqLabel}
                            </span>
                          </div>
                        </div>

                        {/* Row 2 — Close actions (left) */}
                        <div className="flex items-center gap-2">
                          <Button
                            onClick={async (e) => {
                              e.preventDefault();
                              await settleMarketOrder(trade, getCurrentPrice());
                            }}
                            variant="ui"
                            size="small"
                            disabled={isSettling}
                            title="Close at market price"
                            className="h-8 border-theme/30 px-3 text-xs font-semibold transition-all duration-150 hover:brightness-110"
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
                            title={
                              limitPrice
                                ? "Update Limit"
                                : "Close with limit order"
                            }
                            className={cn(
                              "h-8 px-3 text-xs transition-all duration-150 hover:brightness-110",
                              limitPrice
                                ? "border-yellow-400/40 text-yellow-400"
                                : ""
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
                            title={
                              slPrice || tpPrice
                                ? "Update SL/TP"
                                : "Set Stop Loss / Take Profit"
                            }
                            className={cn(
                              "h-8 px-3 text-xs transition-all duration-150 hover:brightness-110",
                              slPrice || tpPrice
                                ? "border-theme/40 text-theme"
                                : ""
                            )}
                          >
                            {slPrice || tpPrice ? "Update SL/TP" : "Set SL/TP"}
                          </Button>
                          {hasAnchors && (
                            <RemoveOrdersDropdown
                              trade={trade}
                              cancelOrder={cancelOrder}
                              isCancelling={isCancellingOrder(trade.uuid)}
                              disabled={isSettling}
                              variant="cards"
                            />
                          )}
                        </div>
                      </div>

                      {/* Right column: timestamp + anchors */}
                      <div className="flex shrink-0 flex-col items-end gap-1.5">
                        <span className="text-primary/55 text-xs tabular-nums">
                          {dayjs(trade.date).format("DD MMM HH:mm:ss")}
                        </span>
                        {hasAnchors && (
                          <div className="flex flex-wrap justify-end gap-x-2 gap-y-1">
                            {slPrice && (
                              <span className="rounded bg-red/10 px-1.5 py-0.5 text-sm font-medium text-red/90">
                                Stop Loss ${slPrice}
                              </span>
                            )}
                            {tpPrice && (
                              <span className="rounded bg-green-medium/10 px-1.5 py-0.5 text-sm font-medium text-green-medium/90">
                                Take Profit ${tpPrice}
                              </span>
                            )}
                            {limitPrice && (
                              <span className="rounded bg-yellow-500/10 px-1.5 py-0.5 text-sm font-medium text-yellow-500/90">
                                Limit ${limitPrice}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Row 3 — Details */}
                    <div className="border-border/30 border-t pt-1">
                      <button
                        type="button"
                        onClick={() => toggleExpand(trade.uuid)}
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
                            <span className="text-primary/45 shrink-0 text-[10px] uppercase tracking-wide">
                              Pos. Value
                            </span>
                            <span className="font-medium">
                              {BTC.format(positionValue, "BTC")}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-primary/45 shrink-0 text-[10px] uppercase tracking-wide">
                              Avail. Margin
                            </span>
                            <span className="font-medium">{availLabel}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-primary/45 shrink-0 text-[10px] uppercase tracking-wide">
                              Maint. Margin
                            </span>
                            <span className="font-medium">{maintLabel}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-primary/45 shrink-0 text-[10px] uppercase tracking-wide">
                              Fee
                            </span>
                            <span className="font-medium">
                              {formatSatsMBtc(trade.feeFilled)}
                            </span>
                          </div>
                          <div className="col-span-2 flex items-center gap-2">
                            <span className="text-primary/45 shrink-0 text-[10px] uppercase tracking-wide">
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
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                openFundingDialog(trade);
                              }}
                              className="rounded p-1 text-primary-accent/40 transition-all duration-150 hover:scale-105 hover:bg-theme/20 hover:text-primary-accent"
                              aria-label="View funding history"
                            >
                              <Info className="h-3 w-3" />
                            </button>
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

export default PositionsCards;
