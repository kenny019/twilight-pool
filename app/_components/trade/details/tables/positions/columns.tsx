import Button from "@/components/button";
import { Info } from "lucide-react";
import cn from "@/lib/cn";
import { capitaliseFirstLetter, formatSatsMBtc } from '@/lib/helpers';
import BTC from '@/lib/twilight/denoms';
import { TradeOrder } from '@/lib/types';
import { ColumnDef } from '@tanstack/react-table';
import Big from 'big.js';
import dayjs from 'dayjs';
import { calculateUpnl } from '../../../orderbook/my-trades/columns';
import { PnlCell, PnlHeader } from '@/lib/components/pnl-display';

// Define the TableMeta interface for global table data
interface PositionsTableMeta {
  getCurrentPrice: () => number;
  getBtcPriceUsd: () => number;
  settleMarketOrder: (trade: TradeOrder, currentPrice: number) => Promise<void>;
  isSettlingOrder: (uuid: string) => boolean;
  openLimitDialog: (account: string) => void;
  openConditionalDialog: (account: string, mode: "limit" | "sltp") => void;
  openFundingDialog: (trade: TradeOrder) => void;
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
    cell: (row) => dayjs(row.row.original.date).format("DD/MM/YYYY HH:mm:ss"),
  },
  {
    accessorKey: "positionSize",
    header: "Pos. Size (USD)",
    cell: (row) => {
      const trade = row.row.original;
      const positionSize = new BTC("sats", Big(trade.positionSize))
        .convert("BTC")
        .toFixed(2)

      return (
        <span className="font-medium">
          ${positionSize}
        </span>
      );
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
      const positionValue = new BTC("sats", Big(Math.abs(trade.positionSize / markPrice)))
        .convert("BTC")

      return (
        <span className="font-medium">
          {BTC.format(positionValue, "BTC")}
        </span>
      );
    },
  },
  {
    accessorKey: "entryPrice",
    header: "Entry Price (USD)",
    accessorFn: (row) => `$${row.entryPrice.toFixed(2)}`
  },
  {
    accessorKey: "leverage",
    header: "Leverage",
    accessorFn: (row) => `${row.leverage.toFixed(2)}x`
  },
  {
    accessorKey: "markPrice",
    header: "Mark Price (USD)",
    cell: (row) => {
      const trade = row.row.original;
      const meta = row.table.options.meta as PositionsTableMeta;

      const currentPrice = meta.getCurrentPrice();
      const markPrice = currentPrice || trade.entryPrice;
      return (
        <span className="font-medium">
          ${markPrice.toFixed(2)}
        </span>
      );
    }
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
      const calculatedUnrealizedPnl = calculateUpnl(trade.entryPrice, currentPrice, trade.positionType, positionSize);

      return <PnlCell pnlSats={calculatedUnrealizedPnl} btcPriceUsd={btcPriceUsd} />;
    },
  },
  {
    accessorKey: "liquidationPrice",
    header: "Liquidation Price (USD)",
    accessorFn: (row) => `$${row.liquidationPrice.toFixed(2)}`
  },
  {
    accessorKey: "availableMargin",
    header: "Avail. Margin (BTC)",
    accessorFn: (row) => BTC.format(new BTC("sats", Big(row.availableMargin)).convert("BTC"), "BTC")
  },
  {
    accessorKey: "maintenanceMargin",
    header: "Maint. Margin (BTC)",
    accessorFn: (row) => BTC.format(new BTC("sats", Big(row.maintenanceMargin)).convert("BTC"), "BTC")
  },
  {
    accessorKey: "funding",
    header: "Funding (mBTC)",
    cell: (row) => {
      const trade = row.row.original;
      const meta = row.table.options.meta as PositionsTableMeta;

      const pnl = trade.unrealizedPnl || 0;
      const funding = trade.fundingApplied != null
        ? Number(trade.fundingApplied)
        : Math.round(trade.initialMargin - trade.availableMargin - trade.feeFilled + pnl);

      return (
        <div className="flex items-center gap-1.5">
          <span className={cn("font-medium",
            funding > 0 ? "text-green-medium" :
              funding < 0 ? "text-red" :
                ""
          )}>
            {formatSatsMBtc(funding)}
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              meta.openFundingDialog(trade);
            }}
            className="text-primary-accent/40 hover:text-primary-accent p-0.5 rounded hover:bg-theme/20 transition-colors"
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
    accessorFn: (row) => formatSatsMBtc(row.feeFilled)
  },
  {
    accessorKey: "positionType",
    header: "Side",
    cell: (row) => {
      const positionType = row.row.original.positionType;

      return (
        <span
          className={cn(
            "px-2 py-1 rounded text-xs font-medium",
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

      const sltpLabel = slPrice && tpPrice
        ? (
          <span className="flex flex-col items-start leading-tight">
            <span className="text-red">SL {slPrice}</span>
            <span className="text-green-medium">TP {tpPrice}</span>
          </span>
        )
        : slPrice
          ? `SL ${slPrice}`
          : tpPrice
            ? `TP ${tpPrice}`
            : "SLTP";

      const sltpActive = !!(slPrice || tpPrice);
      const limitActive = !!limitPrice;

      return (
        <div className="flex flex-row gap-1">
          <Button
            onClick={async (e) => {
              e.preventDefault();
              await meta.settleMarketOrder(trade, meta.getCurrentPrice());
            }}
            variant="ui"
            size="small"
            disabled={isSettling}
            title="Close at market price"
          >
            {isSettling ? "..." : "MKT"}
          </Button>
          <Button
            onClick={(e) => {
              e.preventDefault();
              meta.openConditionalDialog(trade.accountAddress, "limit");
            }}
            variant="ui"
            size="small"
            disabled={isSettling}
            title={limitActive ? `Limit close at ${limitPrice}` : "Close with limit order"}
            className={limitActive ? "text-yellow-400 border-yellow-400/40" : undefined}
          >
            {limitActive ? limitPrice! : "LMT"}
          </Button>
          <Button
            onClick={(e) => {
              e.preventDefault();
              meta.openConditionalDialog(trade.accountAddress, "sltp");
            }}
            variant="ui"
            size="small"
            disabled={isSettling}
            title={sltpActive ? `Edit SL/TP` : "Set Stop Loss / Take Profit"}
            className={sltpActive ? "text-theme border-theme/40" : undefined}
          >
            {sltpLabel}
          </Button>
        </div>
      );
    },
  },
]

// Export the TableMeta type for use in the data table component
export type { PositionsTableMeta };