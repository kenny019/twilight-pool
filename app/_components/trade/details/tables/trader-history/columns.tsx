import { Info } from 'lucide-react';
import {
  capitaliseFirstLetter,
  formatMarginPair,
  formatSatsMBtc,
  truncateHash,
} from '@/lib/helpers';
import { toast } from '@/lib/hooks/useToast';
import BTC from '@/lib/twilight/denoms';
import { TradeOrder } from '@/lib/types';
import { ColumnDef } from '@tanstack/react-table';
import Big from 'big.js';
import dayjs from 'dayjs';
import { PnlCell, PnlHeader } from '@/lib/components/pnl-display';

// Define the TableMeta interface for global table data
interface TraderHistoryTableMeta {
  getCurrentPrice: () => number;
  getBtcPriceUsd: () => number;
  openFundingDialog: (trade: TradeOrder) => void;
}

// Update the interface to remove currentPrice and privateKey from row data
interface MyTradeOrder extends TradeOrder {
  // Remove currentPrice and privateKey from here since they'll be in TableMeta
}

const getTraderHistoryPnl = (trade: TradeOrder) =>
  trade.orderStatus === "LIQUIDATE"
    ? -trade.initialMargin
    : (trade.realizedPnl || trade.unrealizedPnl || 0);

const getTraderHistoryFunding = (trade: TradeOrder) => {
  const pnl = getTraderHistoryPnl(trade);

  return trade.fundingApplied != null
    ? Number(trade.fundingApplied)
    : Math.round(
        trade.initialMargin - trade.availableMargin - trade.feeFilled - trade.feeSettled + pnl
      );
};

const getTraderHistoryStatusLabel = (status: string) => {
  if (status === "LIQUIDATE") return "Liquidated";
  return capitaliseFirstLetter(status);
};

export const traderHistoryColumns: ColumnDef<MyTradeOrder, any>[] = [
  {
    accessorKey: "positionType",
    header: "Side",
    cell: (row) => {
      const positionType = row.getValue() as string;
      return (
        <span className="rounded px-2 py-1 text-xs font-medium bg-primary/10 text-primary/70">
          {capitaliseFirstLetter(positionType)}
        </span>
      );
    },
  },
  {
    accessorKey: "orderStatus",
    header: "Status",
    cell: (row) => {
      const status = row.getValue() as string;
      return (
        <span className="rounded px-2 py-1 text-xs font-medium bg-primary/5 text-primary/55">
          {getTraderHistoryStatusLabel(status)}
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
    accessorKey: "settlementPrice",
    header: "Settlement Price (USD)",
    cell: (row) => {
      const trade = row.row.original;

      if (trade.orderStatus !== "SETTLED" && trade.orderStatus !== "LIQUIDATE") {
        return <span className="text-xs text-primary/40">—</span>;
      }

      return (
        <span className="font-medium">
          ${trade.settlementPrice.toFixed(2)}
        </span>
      );
    }
  },
  {
    accessorKey: "realizedPnl",
    header: () => <PnlHeader variant="PnL" />,
    cell: (row) => {
      const trade = row.row.original;
      const meta = row.table.options.meta as TraderHistoryTableMeta;
      const pnl = getTraderHistoryPnl(trade);

      return (
        <PnlCell
          pnlSats={pnl === undefined || pnl === null ? null : pnl}
          btcPriceUsd={meta.getBtcPriceUsd()}
        />
      );
    },
  },
  {
    accessorKey: "liquidationPrice",
    header: "Liq Price (USD)",
    cell: (row) => {
      const trade = row.row.original;
      const liquidationPrice = trade.liquidationPrice;

      if (!liquidationPrice) {
        return <span className="text-xs text-primary/40">—</span>;
      }

      return (
        <span className="font-medium">
          ${liquidationPrice.toFixed(2)}
        </span>
      );
    }
  },
  {
    accessorKey: "positionSize",
    header: "Notional (USD)",
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
      const markPrice = trade.settlementPrice || trade.entryPrice;
      const positionValue = new BTC("sats", Big(Math.abs(trade.positionSize / markPrice)))
        .convert("BTC");

      return <span className="font-medium">{BTC.format(positionValue, "BTC")}</span>;
    },
  },
  {
    accessorKey: "availableMargin",
    header: "Avail. Margin",
    cell: (row) => {
      const trade = row.row.original;
      const [availLabel] = formatMarginPair(trade.availableMargin, trade.maintenanceMargin);
      return <span className="font-medium">{availLabel}</span>;
    },
  },
  {
    accessorKey: "maintenanceMargin",
    header: "Maint. Margin",
    cell: (row) => {
      const trade = row.row.original;
      const [, maintLabel] = formatMarginPair(trade.availableMargin, trade.maintenanceMargin);
      return <span className="font-medium">{maintLabel}</span>;
    },
  },
  {
    accessorKey: "funding",
    header: "Funding (mBTC)",
    cell: (row) => {
      const trade = row.row.original;
      const meta = row.table.options.meta as TraderHistoryTableMeta;
      const funding = getTraderHistoryFunding(trade);

      return (
        <div className="flex items-center gap-1.5">
          <span className="font-medium">{formatSatsMBtc(funding)}</span>
          {(trade.orderStatus === "SETTLED" || trade.orderStatus === "LIQUIDATE") && (
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
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "feeFilled",
    header: "Fee (mBTC)",
    cell: (row) => {
      const trade = row.row.original;

      const fee = trade.orderStatus === "FILLED" ? trade.feeFilled : trade.feeSettled;

      return (
        <span className="font-medium">
          {formatSatsMBtc(fee)}
        </span>
      );
    }
  },
  {
    accessorKey: "date",
    header: "Time",
    sortingFn: "datetime",
    cell: (row) => dayjs(row.row.original.date).format("DD/MM/YYYY HH:mm:ss"),
  },
  {
    accessorKey: "uuid",
    header: "Order ID",
    cell: (row) => {
      const trade = row.row.original;
      const truncatedUuid = truncateHash(trade.uuid, 4, 4);
      return (
        <span
          onClick={() => {
            navigator.clipboard.writeText(trade.uuid);
            toast({
              title: "Copied to clipboard",
              description: `Order ID ${truncatedUuid} copied to clipboard`,
            });
          }}
          className="cursor-pointer font-medium hover:underline"
        >
          {truncatedUuid}
        </span>
      );
    },
  },
  {
    accessorKey: "tx_hash",
    header: "Tx Hash",
    cell: (row) => {
      const trade = row.row.original;

      if (!trade.tx_hash) {
        return <span className="text-xs text-primary/40">—</span>;
      }

      const truncatedHash = truncateHash(trade.tx_hash, 6, 6);

      return (
        <span
          onClick={() => {
            navigator.clipboard.writeText(trade.tx_hash!);
            toast({
              title: "Copied to clipboard",
              description: `Tx hash ${truncatedHash} copied to clipboard`,
            });
          }}
          className="cursor-pointer font-medium hover:underline"
        >
          {truncatedHash}
        </span>
      );
    },
  },
]

// Export the TableMeta type for use in the data table component
export type { TraderHistoryTableMeta };
