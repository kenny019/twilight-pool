"use client";

import Button from "@/components/button";
import cn from "@/lib/cn";
import BTC from "@/lib/twilight/denoms";
import { ColumnDef, createColumnHelper } from "@tanstack/react-table";
import Big from "big.js";
import Link from "next/link";

type Trade = {
  value: number;
  orderStatus: string;
  orderType: string;
  positionType: string;
  tx_hash: string;
  date: Date;
};

const columnHelper = createColumnHelper();

function capitaliseFirstLetter(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}
// todo: remove or replace with library
const formatDate = (date: Date) =>
  `${date.getDate().toString().padStart(2, "0")}:${(date.getMonth() + 1)
    .toString()
    .padStart(2, "0")}:${date.getFullYear()} ${date
    .getHours()
    .toString()
    .padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}:${date
    .getSeconds()
    .toString()
    .padStart(2, "0")}`;

export const tradeHistoryColumns: ColumnDef<Trade, any>[] = [
  {
    accessorKey: "value",
    header: "Amount (BTC)",
    accessorFn: (row) =>
      new BTC("sats", Big(row.value)).convert("BTC").toString(),
  },
  {
    accessorKey: "positionType",
    header: "Trade Type",
    cell: (row) => (
      <span
        className={cn(
          row.getValue() === "LONG" ? "text-green-medium" : "text-red"
        )}
      >
        Open {capitaliseFirstLetter(row.getValue() as string)}
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
    accessorKey: "tx_hash",
    header: "Transaction Hash",
    cell: (row) => (
      <Button className="justify-end" asChild variant="link">
        <Link href={`https://nyks.twilight-explorer.com/transaction/`}>
          {row.getValue()}
        </Link>
      </Button>
    ),
  },
  {
    accessorKey: "date",
    header: "Order Time",
    accessorFn: (row) => formatDate(new Date(row.date)), // note: as date is stored as string in session storage. it needs to be converted back to date
  },
];
