import Button from '@/components/button';
import cn from '@/lib/cn';
import { capitaliseFirstLetter } from '@/lib/helpers';
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
}

// Update the interface to remove currentPrice and privateKey from row data
interface MyTradeOrder extends TradeOrder {
  // Remove currentPrice and privateKey from here since they'll be in TableMeta
}

export const positionsColumns: ColumnDef<MyTradeOrder, any>[] = [
  {
    accessorKey: "date",
    header: "Time",
    accessorFn: (row) => dayjs(row.date).format("DD/MM/YYYY HH:mm:ss"),
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
    header: "Funding (BTC)",
    cell: (row) => {
      const trade = row.row.original;

      const pnl = trade.unrealizedPnl || 0;
      const funding = Math.round(trade.initialMargin - trade.availableMargin - trade.feeFilled + pnl);

      const fundingBTC = new BTC("sats", Big(funding))
        .convert("BTC")

      return (
        <span className={cn("font-medium",
          funding > 0 ? "text-green-medium" :
            funding < 0 ? "text-red" :
              ""
        )}>
          {BTC.format(fundingBTC, "BTC")}
        </span>
      );
    },
  },
  {
    accessorKey: "feeFilled",
    header: "Fee (BTC)",
    accessorFn: (row) => BTC.format(new BTC("sats", Big(row.feeFilled)).convert("BTC"), "BTC")
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
    header: "Action",
    cell: (row) => {
      const trade = row.row.original;
      const meta = row.table.options.meta as PositionsTableMeta;

      const isSettling = meta.isSettlingOrder(trade.uuid);

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
          >
            {isSettling ? "Closing..." : "Close Market"}
          </Button>
          <Button
            onClick={() => {
              meta.openLimitDialog(trade.accountAddress)
            }}
            variant="ui"
            size="small"
            disabled={isSettling}
          >
            Close Limit
          </Button>
        </div>
      );
    },
  },
]

// Export the TableMeta type for use in the data table component
export type { PositionsTableMeta };