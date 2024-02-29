"use client";

import Button from "@/components/button";
import cn from "@/lib/cn";
import BTC from "@/lib/twilight/denoms";
import { ColumnDef } from "@tanstack/react-table";
import Big from "big.js";

type Trade = {
  value: number;
  orderStatus: string;
  orderType: string;
  positionType: string;
  tx_hash: string;
};

function capitaliseFirstLetter(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export const myTradeColumns: ColumnDef<Trade, any>[] = [
  {
    accessorKey: "value",
    header: "Amount (BTC)",
    accessorFn: (row) =>
      new BTC("sats", Big(row.value)).convert("BTC").toString(),
  },
  {
    accessorKey: "positionType",
    header: "Trade Type",
    cell: (cell) => (
      <span
        className={cn(
          cell.getValue() === "LONG" ? "text-green-medium" : "text-red"
        )}
      >
        Open {capitaliseFirstLetter(cell.getValue() || ("" as string))}
      </span>
    ),
  },
  {
    accessorKey: "orderType",
    header: "Order Type",
  },
  {
    accessorKey: "orderStatus",
    header: "Status",
  },
  {
    id: "close",
    header: "",
    cell: (cell) => (
      <Button
        onClick={async (e) => {
          e.preventDefault();
          const {} = cell.row.original;
        }}
        variant="ui"
        size="small"
      >
        Close
      </Button>
    ),
  },
];
