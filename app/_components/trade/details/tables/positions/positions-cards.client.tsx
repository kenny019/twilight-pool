"use client";

import Button from "@/components/button";
import FundingHistoryDialog from "@/components/funding-history-dialog";
import cn from "@/lib/cn";
import { formatSatsCompact } from "@/lib/helpers";
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

  return (
    <>
      <div
        className="relative w-full overscroll-none px-3 py-2 max-md:px-4 max-md:py-3"
      >
        <div className="grid grid-cols-1 gap-3 max-md:gap-3.5 xl:grid-cols-2">
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

              // Zone 3: risk row (flex-wrap on small screens)
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
                  className="border-border/70 hover:border-theme/35 group relative overflow-hidden rounded-xl border bg-zinc-50/95 shadow-sm transition-all duration-150 hover:-translate-y-[1px] hover:shadow-md dark:bg-zinc-900/55"
                >
                  {/* Left accent bar — direction-coded */}
                  <div
                    className={cn("absolute inset-y-0 left-0 w-0.5", accentBar)}
                  />

                  <div className="px-3 py-2.5 pl-[14px] max-md:px-3 max-md:py-3">
                    {/* ── Desktop header: badges left, PnL right ── */}
                    <div className="mb-3 hidden items-center justify-between md:flex">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "rounded px-1.5 py-0.5 text-xs font-semibold",
                            sideClass
                          )}
                        >
                          {trade.positionType}
                        </span>
                        <span className="rounded bg-primary/8 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-primary/70">
                          {levLabel}
                        </span>
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-green-medium" />
                        <span className="text-[11px] tabular-nums text-primary/45">
                          {dayjs(trade.date).format("DD MMM HH:mm:ss")}
                        </span>
                      </div>
                      {hasPnl && (
                        <PnlCell
                          pnlSats={calculatedUnrealizedPnl}
                          btcPriceUsd={btcPriceUsd}
                          className="text-sm font-semibold"
                          layout="responsive"
                        />
                      )}
                    </div>

                    {/* ── Desktop stats grid ── */}
                    <div className="mb-3 hidden grid-cols-4 gap-x-4 md:grid">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] uppercase tracking-wide text-gray-500">
                          Entry
                        </span>
                        <span className="text-[13px] font-semibold tabular-nums text-primary">
                          {entryLabel}
                        </span>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] uppercase tracking-wide text-gray-500">
                          Mark
                        </span>
                        <span className="text-[13px] font-semibold tabular-nums text-primary">
                          {markLabel}
                        </span>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] uppercase tracking-wide text-gray-500">
                          Notional
                        </span>
                        <span className="text-[13px] font-semibold tabular-nums text-primary">
                          {notionalLabel}
                        </span>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] uppercase tracking-wide text-gray-500">
                          Liquidation
                        </span>
                        <span className="text-[13px] font-semibold tabular-nums text-primary">
                          {liqLabel}
                        </span>
                      </div>
                    </div>

                    {/* ── Mobile header ── */}
                    <div className="mb-2 flex items-center justify-between md:hidden">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "rounded px-1.5 py-0.5 text-xs font-semibold",
                            sideClass
                          )}
                        >
                          {trade.positionType}
                        </span>
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-green-medium" />
                      </div>
                      <span className="text-[11px] tabular-nums text-primary/55">
                        {dayjs(trade.date).format("DD MMM HH:mm:ss")}
                      </span>
                    </div>

                    {/* ── Mobile: Entry / Mark / PnL ── */}
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
                          Mark
                        </span>
                        <span className="text-sm font-semibold tabular-nums text-primary">
                          {markLabel}
                        </span>
                      </div>
                      {hasPnl && (
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[10px] uppercase tracking-wide text-gray-500">
                            PnL
                          </span>
                          <PnlCell
                            pnlSats={calculatedUnrealizedPnl}
                            btcPriceUsd={btcPriceUsd}
                            className="text-sm font-semibold"
                            layout="stacked"
                          />
                        </div>
                      )}
                    </div>

                    {/* ── Mobile: risk stats 2×2 ── */}
                    <div className="mb-3 grid grid-cols-2 gap-x-4 gap-y-2 md:hidden">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] uppercase tracking-wide text-gray-500">
                          Notional
                        </span>
                        <span className="truncate text-sm font-semibold tabular-nums text-primary">
                          {notionalLabel}
                        </span>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] uppercase tracking-wide text-gray-500">
                          Leverage
                        </span>
                        <span className="text-sm font-semibold tabular-nums text-primary">
                          {levLabel}
                        </span>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] uppercase tracking-wide text-gray-500">
                          Liquidation
                        </span>
                        <span className="truncate text-sm font-semibold tabular-nums text-primary">
                          {liqLabel}
                        </span>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] uppercase tracking-wide text-gray-500">
                          Exposure
                        </span>
                        <span className="truncate text-sm font-semibold tabular-nums text-primary">
                          {formatSatsCompact(
                            Math.round(
                              positionValue.mul(100_000_000).toNumber()
                            )
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Anchor pills */}
                    {hasAnchors && (
                      <div className="mb-3 flex flex-wrap gap-1.5">
                        {slPrice && (
                          <span className="rounded bg-red/10 px-1.5 py-0.5 text-[11px] font-medium text-red/90">
                            SL ${slPrice}
                          </span>
                        )}
                        {tpPrice && (
                          <span className="rounded bg-green-medium/10 px-1.5 py-0.5 text-[11px] font-medium text-green-medium/90">
                            TP ${tpPrice}
                          </span>
                        )}
                        {limitPrice && (
                          <span className="rounded bg-yellow-500/10 px-1.5 py-0.5 text-[11px] font-medium text-yellow-500/90">
                            Limit ${limitPrice}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="border-t border-border/40 pt-2">
                      <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-2">
                        <Button
                          onClick={async (e) => {
                            e.preventDefault();
                            await settleMarketOrder(trade, getCurrentPrice());
                          }}
                          variant="ui"
                          size="small"
                          disabled={isSettling}
                          title="Close at market price"
                          className="h-7 border-theme/40 px-2.5 text-[11px] font-semibold transition-all duration-150 hover:brightness-110 max-md:h-10 max-md:w-full max-md:border-theme/50 max-md:text-[13px]"
                        >
                          {isSettling ? "Closing..." : "Close Market"}
                        </Button>
                        <div className="grid grid-cols-2 gap-2 md:contents">
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
                              "h-7 px-2.5 text-[11px] transition-all duration-150 hover:brightness-110 max-md:h-10 max-md:text-[13px]",
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
                              "h-7 px-2.5 text-[11px] transition-all duration-150 hover:brightness-110 max-md:h-10 max-md:text-[13px]",
                              slPrice || tpPrice
                                ? "border-theme/40 text-theme"
                                : ""
                            )}
                          >
                            {slPrice || tpPrice ? "Update SL/TP" : "Set SL/TP"}
                          </Button>
                        </div>
                        {hasAnchors && (
                          <div className="max-md:flex max-md:justify-center md:inline">
                            <RemoveOrdersDropdown
                              trade={trade}
                              cancelOrder={cancelOrder}
                              isCancelling={isCancellingOrder(trade.uuid)}
                              disabled={isSettling}
                              variant="cards"
                            />
                          </div>
                        )}
                      </div>

                      {/* Expandable details */}
                      <button
                        type="button"
                        onClick={() => toggleExpand(trade.uuid)}
                        className="mt-1 flex min-h-[44px] w-full items-center justify-between rounded-md px-0.5 py-1.5 text-[10px] uppercase tracking-wide text-gray-500 transition-colors duration-150 hover:bg-primary/5 hover:text-primary/60 max-md:min-h-[48px] md:min-h-0 md:py-0.5"
                      >
                        <span>Details</span>
                        {isExpanded ? (
                          <ChevronUp className="h-3 w-3" />
                        ) : (
                          <ChevronDown className="h-3 w-3" />
                        )}
                      </button>

                      {isExpanded && (
                        <div className="grid grid-cols-2 gap-x-6 gap-y-2 pb-1 text-[11px] md:grid-cols-3">
                          <div className="flex flex-col gap-0.5">
                            <span className="shrink-0 text-[10px] uppercase tracking-wide text-gray-500">
                              Pos. Value
                            </span>
                            <span className="font-medium tabular-nums">
                              {formatSatsCompact(Math.round(positionValue.mul(100_000_000).toNumber()))}
                            </span>
                          </div>
                          <div className="flex flex-col gap-0.5">
                            <span className="shrink-0 text-[10px] uppercase tracking-wide text-gray-500">
                              Avail. Margin
                            </span>
                            <span className="font-medium tabular-nums">{availLabel}</span>
                          </div>
                          <div className="flex flex-col gap-0.5">
                            <span className="shrink-0 text-[10px] uppercase tracking-wide text-gray-500">
                              Maint. Margin
                            </span>
                            <span className="font-medium tabular-nums">{maintLabel}</span>
                          </div>
                          <div className="flex flex-col gap-0.5">
                            <span className="shrink-0 text-[10px] uppercase tracking-wide text-gray-500">
                              Fee
                            </span>
                            <span className="font-medium tabular-nums">
                              {formatSatsCompact(trade.feeFilled)}
                            </span>
                          </div>
                          <div className="flex flex-col gap-0.5">
                            <span className="shrink-0 text-[10px] uppercase tracking-wide text-gray-500">
                              Funding
                            </span>
                            <div className="flex items-center gap-1.5">
                              <span
                                className={cn(
                                  "font-medium tabular-nums",
                                  funding > 0
                                    ? "text-green-medium"
                                    : funding < 0
                                      ? "text-red"
                                      : ""
                                )}
                              >
                                {formatSatsCompact(funding)}
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
                          </div>
                          <div className="flex flex-col gap-0.5">
                            <span className="shrink-0 text-[10px] uppercase tracking-wide text-gray-500">
                              Exposure
                            </span>
                            <span className="font-medium tabular-nums">
                              {formatSatsCompact(
                                Math.round(
                                  positionValue.mul(100_000_000).toNumber()
                                )
                              )}
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

export default PositionsCards;
