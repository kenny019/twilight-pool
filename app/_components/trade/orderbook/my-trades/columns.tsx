"use client";

import Button from "@/components/button";
import cn from "@/lib/cn";
import { formatSatsMBtc } from "@/lib/helpers";
import BTC from "@/lib/twilight/denoms";
import { TradeOrder } from "@/lib/types";
import { ColumnDef } from "@tanstack/react-table";
import Big from "big.js";
import dayjs from 'dayjs';

interface MyTradeOrder extends TradeOrder {
  onSettle: (trade: TradeOrder) => void;
  onCancel: (trade: TradeOrder) => void;
  openFundingDialog?: (trade: TradeOrder) => void;
  currentPrice?: number;
  calculatedUnrealizedPnl?: number;
}

function capitaliseFirstLetter(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export const calculateUpnl = (entryPrice: number, currentPrice: number, positionType: string, positionSize: number) => {
  if (currentPrice === 0 || entryPrice === 0) {
    return 0;
  }

  switch (positionType.toUpperCase()) {
    case 'LONG':
      return (positionSize * (currentPrice - entryPrice)) / (entryPrice * currentPrice);

    case 'SHORT':
      return (positionSize * (entryPrice - currentPrice)) / (entryPrice * currentPrice);

    default:
      return 0;
  }
};

export const myTradesColumns: ColumnDef<MyTradeOrder, any>[] = [
  {
    accessorKey: "date",
    header: "Date & Time",
    accessorFn: (row) => dayjs(row.date).format("DD/MM/YYYY HH:mm:ss"),
  },
  {
    accessorKey: "positionSize",
    header: "Position Size (USD)",
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
    header: "Position Value (BTC)",
    cell: (row) => {
      const trade = row.row.original;
      const markPrice = trade.entryPrice || 1;
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
    accessorKey: "leverage",
    header: "Leverage",
    cell: (row) => {
      const trade = row.row.original;

      return (
        <span className="font-medium">
          {trade.leverage.toFixed(2)}x
        </span>
      );
    },
  },
  {
    accessorKey: "entryPrice",
    header: "Entry Price (USD)",
    cell: (row) => {
      const trade = row.row.original;
      return (
        <span className="font-medium">
          ${trade.entryPrice.toFixed(2)}
        </span>
      );
    },
  },
  {
    accessorKey: "markPrice",
    header: "Mark Price (USD)",
    cell: (row) => {
      const trade = row.row.original;
      const markPrice = trade.currentPrice || trade.entryPrice;

      return (
        <span className="font-medium">
          ${markPrice.toFixed(2)}
        </span>
      );
    },
  },
  {
    accessorKey: "calculatedUnrealizedPnl",
    header: "uPnL (BTC)",
    cell: (row) => {
      const trade = row.row.original;

      const upnl = trade.calculatedUnrealizedPnl
      const isPendingLimit = trade.orderType === "LIMIT" && trade.orderStatus === "PENDING";

      if (upnl === undefined || upnl === null || isPendingLimit) {
        return <span className="text-xs text-gray-500">—</span>;
      }

      const isPositive = upnl > 0;
      const isNegative = upnl < 0;

      const displayupnl = BTC.format(new BTC("sats", Big(upnl)).convert("BTC"), "BTC");

      return (
        <span
          className={cn(
            "text-xs font-medium",
            isPositive && "text-green-medium",
            isNegative && "text-red",
            !isPositive && !isNegative && "text-gray-500"
          )}
        >
          {isPositive ? "+" : ""}{displayupnl}
        </span>
      );
    },
  },
  {
    accessorKey: "liquidationPrice",
    header: "Liq. Price (USD)",
    cell: (row) => {
      const trade = row.row.original;

      const isPendingLimit = trade.orderType === "LIMIT" && trade.orderStatus === "PENDING";

      if (isPendingLimit) {
        return <span className="text-xs text-gray-500">—</span>;
      }

      return (
        <span className="font-medium">
          ${trade.liquidationPrice.toFixed(2)}
        </span>
      );
    },
  },
  {
    accessorKey: "availableMargin",
    header: "Avl. Margin (BTC)",
    cell: (row) => {
      const trade = row.row.original;

      const isPendingLimit = trade.orderType === "LIMIT" && trade.orderStatus === "PENDING";

      if (isPendingLimit) {
        return <span className="text-xs text-gray-500">—</span>;
      }

      const availableMargin = new BTC("sats", Big(trade.availableMargin))
        .convert("BTC")

      return (
        <span className="font-medium">
          {BTC.format(availableMargin, "BTC")}
        </span>
      );
    },
  },
  {
    accessorKey: "funding",
    header: "Funding (mBTC)",
    cell: (row) => {
      const trade = row.row.original;

      if (trade.orderStatus !== "FILLED") {
        return <span className="text-xs text-gray-500">—</span>;
      }

      const fee = trade.feeFilled;

      const funding = Math.round(trade.initialMargin - trade.availableMargin - fee);

      return (
        <div className="flex items-center gap-2">
          <span className={cn("font-medium",
            funding > 0 ? "text-green-medium" :
              funding < 0 ? "text-red" :
                ""
          )}>
            {formatSatsMBtc(funding)}
          </span>
          {trade.openFundingDialog && (
            <Button
              variant="ui"
              size="small"
              onClick={(e) => {
                e.preventDefault();
                trade.openFundingDialog?.(trade);
              }}
              className="px-2 py-0.5 text-xs"
            >
              Details
            </Button>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "fee",
    header: "Fee (mBTC)",
    cell: (row) => {
      const fee = row.getValue() as number;
      const trade = row.row.original;

      if (trade.orderStatus === "PENDING") {
        return <span className="text-xs text-gray-500">—</span>;
      }

      return (
        <span className="font-medium">
          {formatSatsMBtc(fee)}
        </span>
      );
    },
  },
  {
    accessorKey: "positionType",
    header: "Type",
    cell: (row) => {
      const positionType = row.getValue() as string;
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

      return (
        <div className="flex space-x-2 justify-start">
          {trade.orderType === "LIMIT" && trade.orderStatus === "PENDING" && (
            <Button
              onClick={async (e) => {
                e.preventDefault();
                trade.onCancel(trade);
              }}
              variant="ui"
              size="small"
            >
              Cancel
            </Button>
          )}
          {((trade.orderType === "LIMIT" && trade.orderStatus === "FILLED") ||
            trade.orderType === "MARKET") && (
              <Button
                onClick={async (e) => {
                  e.preventDefault();
                  trade.onSettle(trade);
                }}
                variant="ui"
                size="small"
              >
                Close
              </Button>
            )}
        </div>
      );
    },
  },
];
