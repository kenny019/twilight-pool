import { Text } from "@/components/typography";
import { Info } from "lucide-react";
import cn from "@/lib/cn";
import {
  capitaliseFirstLetter,
  formatSatsMBtc,
  truncateHash,
} from "@/lib/helpers";
import { toast } from "@/lib/hooks/useToast";
import BTC from "@/lib/twilight/denoms";
import { TradeOrder } from "@/lib/types";
import { ColumnDef } from "@tanstack/react-table";
import Big from "big.js";
import dayjs from "dayjs";
import Link from "next/link";
import { PnlCell, PnlHeader } from "@/lib/components/pnl-display";

// Define the TableMeta interface for global table data
interface OrderHistoryTableMeta {
  getCurrentPrice: () => number;
  getBtcPriceUsd: () => number;
  openFundingDialog: (trade: TradeOrder) => void;
}

// Update the interface to remove currentPrice and privateKey from row data
interface MyTradeOrder extends TradeOrder {
  // Remove currentPrice and privateKey from here since they'll be in TableMeta
}

const EVENT_BADGE_STYLES: Record<string, string> = {
  LIMIT_CLOSE: "bg-blue-500/10 text-blue-500",
  STOP_LOSS: "bg-orange-500/10 text-orange-500",
  TAKE_PROFIT: "bg-purple-500/10 text-purple-500",
  NONE: "bg-gray-500/10 text-gray-500",
};

/** Column IDs that cannot be hidden via the column filter. */
export const MANDATORY_COLUMNS = new Set([
  "date",
  "uuid",
  "orderType",
  "orderStatus",
]);

/** Column IDs hidden by default (user can enable them). */
export const DEFAULT_HIDDEN_COLUMNS = new Set([
  "request_id",
  "eventStatus",
  "reason",
  "priceChange",
]);

function formatEventStatus(status: string): string {
  // Convert camelCase/PascalCase to spaced words: "StopLossAdded" -> "Stop Loss Added"
  return status.replace(/([a-z])([A-Z])/g, "$1 $2");
}

export const orderHistoryColumns: ColumnDef<MyTradeOrder, any>[] = [
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
    header: "TxHash",
    cell: (row) => {
      const order = row.row.original;

      const showTxHash =
        order.tx_hash &&
        (order.orderStatus === "FILLED" ||
          order.orderStatus === "SETTLED" ||
          order.orderStatus === "LIQUIDATE");

      if (!showTxHash) {
        return <Text className="text-primary-accent">-</Text>;
      }

      return (
        <Link
          href={`${process.env.NEXT_PUBLIC_EXPLORER_URL as string}/txs/${order.tx_hash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium hover:underline"
        >
          {truncateHash(order.tx_hash)}
        </Link>
      );
    },
  },
  {
    accessorKey: "orderType",
    header: "Type",
    accessorFn: (row) => capitaliseFirstLetter(row.orderType),
  },
  {
    accessorKey: "orderStatus",
    header: "Status",
    cell: (row) => {
      const status = row.getValue() as string;
      return (
        <span
          className={cn(
            "rounded px-2 py-1 text-xs font-medium",
            status === "SETTLED"
              ? "bg-green-medium/10 text-green-medium"
              : status === "LIQUIDATE"
                ? "bg-red/10 text-red"
                : "bg-gray-500/10 text-gray-500"
          )}
        >
          {capitaliseFirstLetter(status)}
        </span>
      );
    },
  },
  {
    id: "eventStatus",
    accessorKey: "eventStatus",
    header: "Event",
    cell: (row) => {
      const trade = row.row.original;
      const eventStatus = trade.eventStatus;

      if (!eventStatus || eventStatus === trade.orderStatus) {
        return <span className="text-xs text-gray-500">—</span>;
      }

      const priceKind = trade.priceKind ?? "NONE";
      const badgeStyle =
        EVENT_BADGE_STYLES[priceKind] ?? EVENT_BADGE_STYLES.NONE;

      return (
        <span
          className={cn("rounded px-2 py-1 text-xs font-medium", badgeStyle)}
          title={trade.reason ?? undefined}
        >
          {formatEventStatus(eventStatus)}
        </span>
      );
    },
  },
  {
    id: "triggerPrice",
    accessorKey: "displayPrice",
    header: "Trigger Price",
    cell: (row) => {
      const trade = row.row.original;

      if (!trade.displayPrice || trade.priceKind === "NONE") {
        return <span className="text-xs text-gray-500">—</span>;
      }

      const priceKind = trade.priceKind ?? "NONE";
      const kindLabel =
        priceKind === "STOP_LOSS"
          ? "SL"
          : priceKind === "TAKE_PROFIT"
            ? "TP"
            : "Limit";

      return (
        <span
          className="font-medium"
          title={`${kindLabel}: $${trade.displayPrice.toFixed(2)}${
            trade.displayPriceBefore != null
              ? ` (was $${trade.displayPriceBefore.toFixed(2)})`
              : ""
          }`}
        >
          ${trade.displayPrice.toFixed(2)}
        </span>
      );
    },
  },
  {
    id: "priceChange",
    header: "Price Change",
    cell: (row) => {
      const trade = row.row.original;

      if (trade.old_price == null && trade.new_price == null) {
        return <span className="text-xs text-gray-500">—</span>;
      }

      const oldLabel =
        trade.old_price != null ? `$${trade.old_price.toFixed(2)}` : "—";
      const newLabel =
        trade.new_price != null ? `$${trade.new_price.toFixed(2)}` : "—";

      return (
        <span className="text-xs font-medium tabular-nums">
          {oldLabel} → {newLabel}
        </span>
      );
    },
  },
  {
    id: "reason",
    accessorKey: "reason",
    header: "Reason",
    cell: (row) => {
      const trade = row.row.original;

      if (!trade.reason) {
        return <span className="text-xs text-gray-500">—</span>;
      }

      return (
        <span
          className="max-w-[120px] truncate text-xs text-primary-accent"
          title={trade.reason}
        >
          {trade.reason}
        </span>
      );
    },
  },
  {
    accessorKey: "positionType",
    header: "Side",
    cell: (row) => {
      const positionType = row.getValue() as string;
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
      const markPrice = trade.settlementPrice || trade.entryPrice;

      if (!markPrice) {
        return <span className="text-xs text-gray-500">—</span>;
      }

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
    accessorKey: "settlementPrice",
    header: "Settlement Price (USD)",
    cell: (row) => {
      const trade = row.row.original;

      if (
        trade.orderStatus !== "SETTLED" &&
        trade.orderStatus !== "LIQUIDATE"
      ) {
        return <span className="text-xs text-gray-500">—</span>;
      }

      return (
        <span className="font-medium">${trade.settlementPrice.toFixed(2)}</span>
      );
    },
  },
  {
    accessorKey: "leverage",
    header: "Leverage",
    accessorFn: (row) => `${row.leverage.toFixed(2)}x`,
  },
  {
    accessorKey: "realizedPnl",
    header: () => <PnlHeader variant="PnL" />,
    cell: (row) => {
      const trade = row.row.original;
      const meta = row.table.options.meta as OrderHistoryTableMeta;

      const pnl =
        trade.orderStatus === "LIQUIDATE"
          ? -trade.initialMargin
          : trade.realizedPnl || trade.unrealizedPnl || 0;

      return (
        <PnlCell
          pnlSats={pnl === undefined || pnl === null ? null : pnl}
          btcPriceUsd={meta.getBtcPriceUsd()}
        />
      );
    },
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
    accessorKey: "funding",
    header: "Funding (mBTC)",
    cell: (row) => {
      const trade = row.row.original;
      const meta = row.table.options.meta as OrderHistoryTableMeta;

      const status = trade.orderStatus;
      if (
        status !== "FILLED" &&
        status !== "SETTLED" &&
        status !== "LIQUIDATE"
      ) {
        return <span className="text-xs text-gray-500">-</span>;
      }

      const pnl =
        status === "LIQUIDATE"
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
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              "font-medium",
              funding > 0 ? "text-green-medium" : funding < 0 ? "text-red" : ""
            )}
          >
            {formatSatsMBtc(funding)}
          </span>
          {(status === "SETTLED" || status === "LIQUIDATE") && (
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

      const fee =
        trade.orderStatus === "FILLED" ? trade.feeFilled : trade.feeSettled;

      if (
        trade.orderStatus === "CANCELLED" ||
        trade.orderStatus === "LIQUIDATE" ||
        trade.orderStatus === "PENDING"
      ) {
        return <span className="text-xs text-gray-500">-</span>;
      }

      return <span className="font-medium">{formatSatsMBtc(fee)}</span>;
    },
  },
  {
    id: "request_id",
    accessorKey: "request_id",
    header: "Request ID",
    cell: (row) => {
      const trade = row.row.original;

      if (!trade.request_id) {
        return <span className="text-xs text-gray-500">—</span>;
      }

      return (
        <span
          onClick={() => {
            navigator.clipboard.writeText(trade.request_id!);
            toast({
              title: "Copied to clipboard",
              description: "Request ID copied to clipboard",
            });
          }}
          className="cursor-pointer text-xs font-medium hover:underline"
        >
          {truncateHash(trade.request_id, 4, 4)}
        </span>
      );
    },
  },
];

// Export the TableMeta type for use in the data table component
export type { OrderHistoryTableMeta };
