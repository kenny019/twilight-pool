import Button from "@/components/button";
import { RemoveOrdersDropdown } from "./remove-orders-dropdown";
import { Info } from "lucide-react";
import cn from "@/lib/cn";
import { capitaliseFirstLetter, formatSatsMBtc } from "@/lib/helpers";
import BTC from "@/lib/twilight/denoms";
import { TradeOrder } from "@/lib/types";
import { ColumnDef } from "@tanstack/react-table";
import Big from "big.js";
import dayjs from "dayjs";
import { calculateUpnl } from "../../../orderbook/my-trades/columns";
import { PnlCell, PnlHeader } from "@/lib/components/pnl-display";

// Define the TableMeta interface for global table data
interface PositionsTableMeta {
  getCurrentPrice: () => number;
  getBtcPriceUsd: () => number;
  settleMarketOrder: (trade: TradeOrder, currentPrice: number) => Promise<void>;
  isSettlingOrder: (uuid: string) => boolean;
  openLimitDialog: (account: string) => void;
  openConditionalDialog: (account: string, mode: "limit" | "sltp") => void;
  openFundingDialog: (trade: TradeOrder) => void;
  cancelOrder: (
    order: TradeOrder,
    options?: { sl_bool?: boolean; tp_bool?: boolean }
  ) => Promise<void>;
  isCancellingOrder: (uuid: string) => boolean;
}

// Update the interface to remove currentPrice and privateKey from row data
interface MyTradeOrder extends TradeOrder {
  // Remove currentPrice and privateKey from here since they'll be in TableMeta
}

export const positionsColumns: ColumnDef<MyTradeOrder, any>[] = [
  {
    accessorKey: "date",
    header: "Time",
    sortingFn: "datetime",
    cell: (row) => (
      <div className="flex flex-col leading-tight">
        <span>{dayjs(row.row.original.date).format("DD/MM/YYYY")}</span>
        <span className="text-primary-accent">
          {dayjs(row.row.original.date).format("HH:mm:ss")}
        </span>
      </div>
    ),
  },
  {
    accessorKey: "positionSize",
    header: "Pos. Size (USD)",
    cell: (row) => {
      const trade = row.row.original;
      const positionSize = new BTC("sats", Big(trade.positionSize))
        .convert("BTC")
        .toFixed(2);

      return <span className="font-medium">${positionSize}</span>;
    },
  },
  {
    accessorKey: "positionValue",
    header: "Pos. Value (BTC)",
    cell: (row) => {
      const trade = row.row.original;
      const meta = row.table.options.meta as PositionsTableMeta;

      const currentPrice = meta.getCurrentPrice();

      const markPrice = currentPrice || trade.entryPrice;
      const positionValue = new BTC(
        "sats",
        Big(Math.abs(trade.positionSize / markPrice))
      ).convert("BTC");

      return (
        <span className="font-medium">{BTC.format(positionValue, "BTC")}</span>
      );
    },
  },
  {
    accessorKey: "entryPrice",
    header: "Entry Price (USD)",
    accessorFn: (row) => `$${row.entryPrice.toFixed(2)}`,
  },
  {
    accessorKey: "leverage",
    header: "Leverage",
    accessorFn: (row) => `${row.leverage.toFixed(2)}x`,
  },
  {
    accessorKey: "markPrice",
    header: "Mark Price (USD)",
    cell: (row) => {
      const trade = row.row.original;
      const meta = row.table.options.meta as PositionsTableMeta;

      const currentPrice = meta.getCurrentPrice();
      const markPrice = currentPrice || trade.entryPrice;
      return <span className="font-medium">${markPrice.toFixed(2)}</span>;
    },
  },
  {
    accessorKey: "unrealizedPnl",
    header: () => <PnlHeader variant="PnL" />,
    cell: (row) => {
      const trade = row.row.original;
      const meta = row.table.options.meta as PositionsTableMeta;
      const currentPrice = meta.getCurrentPrice();
      const btcPriceUsd = meta.getBtcPriceUsd();

      const positionSize = trade.positionSize;
      const calculatedUnrealizedPnl = calculateUpnl(
        trade.entryPrice,
        currentPrice,
        trade.positionType,
        positionSize
      );

      return (
        <PnlCell pnlSats={calculatedUnrealizedPnl} btcPriceUsd={btcPriceUsd} />
      );
    },
  },
  {
    accessorKey: "liquidationPrice",
    header: "Liquidation Price (USD)",
    accessorFn: (row) => `$${row.liquidationPrice.toFixed(2)}`,
  },
  {
    accessorKey: "availableMargin",
    header: "Avail. Margin (BTC)",
    accessorFn: (row) =>
      BTC.format(
        new BTC("sats", Big(row.availableMargin)).convert("BTC"),
        "BTC"
      ),
  },
  {
    accessorKey: "maintenanceMargin",
    header: "Maint. Margin (BTC)",
    accessorFn: (row) =>
      BTC.format(
        new BTC("sats", Big(row.maintenanceMargin)).convert("BTC"),
        "BTC"
      ),
  },
  {
    accessorKey: "funding",
    header: "Funding (mBTC)",
    cell: (row) => {
      const trade = row.row.original;
      const meta = row.table.options.meta as PositionsTableMeta;

      const pnl = trade.unrealizedPnl || 0;
      const funding =
        trade.fundingApplied != null
          ? Number(trade.fundingApplied)
          : Math.round(
              trade.initialMargin -
                trade.availableMargin -
                trade.feeFilled +
                pnl
            );

      return (
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              "font-medium",
              funding > 0 ? "text-green-medium" : funding < 0 ? "text-red" : ""
            )}
          >
            {formatSatsMBtc(funding).split(" ")[0]}
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              meta.openFundingDialog(trade);
            }}
            className="rounded p-0.5 text-primary-accent/40 transition-colors hover:bg-theme/20 hover:text-primary-accent"
            aria-label="View funding history"
          >
            <Info className="h-3.5 w-3.5" />
          </button>
        </div>
      );
    },
  },
  {
    accessorKey: "feeFilled",
    header: "Fee (mBTC)",
    accessorFn: (row) => formatSatsMBtc(row.feeFilled).split(" ")[0],
  },
  {
    accessorKey: "positionType",
    header: "Side",
    cell: (row) => {
      const positionType = row.row.original.positionType;

      return (
        <span
          className={cn(
            "rounded px-2 py-1 text-xs font-medium",
            positionType === "LONG"
              ? "bg-green-medium/10 text-green-medium"
              : "bg-red/10 text-red"
          )}
        >
          {capitaliseFirstLetter(positionType)}
        </span>
      );
    },
  },
  {
    accessorKey: "actions",
    header: "Close",
    cell: (row) => {
      const trade = row.row.original;
      const meta = row.table.options.meta as PositionsTableMeta;

      const isSettling = meta.isSettlingOrder(trade.uuid);

      const limitPrice = trade.settleLimit?.price
        ? `$${Number(trade.settleLimit.price).toFixed(2)}`
        : null;

      const slPrice = trade.stopLoss?.price
        ? `$${Number(trade.stopLoss.price).toFixed(2)}`
        : null;

      const tpPrice = trade.takeProfit?.price
        ? `$${Number(trade.takeProfit.price).toFixed(2)}`
        : null;

      const sltpActive = !!(slPrice || tpPrice);
      const limitActive = !!limitPrice;
      const hasAnchors = limitActive || sltpActive;
      const isCancelling = meta.isCancellingOrder(trade.uuid);

      const sltpButtonLabel = !sltpActive
        ? "SL / TP"
        : slPrice && tpPrice
          ? "Update SL / TP"
          : slPrice
            ? "Update Stop Loss"
            : "Update Take Profit";

      const sltpButtonClass = sltpActive
        ? slPrice && tpPrice
          ? "border-theme/60 text-theme bg-theme/6 hover:bg-theme/10"
          : slPrice
            ? "border-red/60 text-red bg-red/6 hover:bg-red/10"
            : "border-green-medium/60 text-green-medium bg-green-medium/6 hover:bg-green-medium/10"
        : undefined;

      return (
        <div className="flex flex-col gap-1.5">
          {/* Action buttons row */}
          <div className="flex items-center gap-1">
            <Button
              onClick={async (e) => {
                e.preventDefault();
                await meta.settleMarketOrder(trade, meta.getCurrentPrice());
              }}
              variant="ui"
              size="small"
              disabled={isSettling}
              title="Close at market price"
              className="hover:bg-theme/8 !h-7 !min-h-0 border-theme/50 !py-0 px-2.5 text-[11px] text-theme"
            >
              {isSettling ? "..." : "Market"}
            </Button>
            <Button
              onClick={(e) => {
                e.preventDefault();
                meta.openConditionalDialog(trade.accountAddress, "limit");
              }}
              variant="ui"
              size="small"
              disabled={isSettling}
              title={
                limitActive
                  ? `Update close limit at ${limitPrice}`
                  : "Close with limit order"
              }
              className={cn(
                "!h-7 !min-h-0 !py-0 px-2.5 text-[11px]",
                limitActive
                  ? "bg-yellow-400/6 border-yellow-400/60 text-yellow-400 hover:bg-yellow-400/10"
                  : undefined
              )}
            >
              {limitActive ? "Update Limit" : "Limit"}
            </Button>
            <Button
              onClick={(e) => {
                e.preventDefault();
                meta.openConditionalDialog(trade.accountAddress, "sltp");
              }}
              variant="ui"
              size="small"
              disabled={isSettling}
              title={
                sltpActive
                  ? "Update Stop Loss / Take Profit"
                  : "Set Stop Loss / Take Profit"
              }
              className={cn(
                "!h-7 !min-h-0 !py-0 px-2.5 text-[11px]",
                sltpButtonClass
              )}
            >
              {sltpButtonLabel}
            </Button>
            {hasAnchors && (
              <RemoveOrdersDropdown
                trade={trade}
                cancelOrder={meta.cancelOrder}
                isCancelling={isCancelling}
                disabled={isSettling}
                variant="table"
              />
            )}
          </div>

          {/* Anchor price pills — only rendered when orders are set */}
          {hasAnchors && (
            <div className="flex flex-wrap gap-1">
              {limitPrice && (
                <span className="border-yellow-400/45 bg-yellow-400/15 rounded-full border px-1.5 py-0.5 text-[10px] font-medium text-yellow-400">
                  LMT {limitPrice}
                </span>
              )}
              {slPrice && (
                <span className="border-red/45 bg-red/15 rounded-full border px-1.5 py-0.5 text-[10px] font-medium text-red">
                  SL {slPrice}
                </span>
              )}
              {tpPrice && (
                <span className="border-green-medium/45 bg-green-medium/15 rounded-full border px-1.5 py-0.5 text-[10px] font-medium text-green-medium">
                  TP {tpPrice}
                </span>
              )}
            </div>
          )}
        </div>
      );
    },
  },
];

// Export the TableMeta type for use in the data table component
export type { PositionsTableMeta };
