"use client";

import Button from "@/components/button";
import BTC from "@/lib/twilight/denoms";
import { TransactionHistory } from "@/lib/types";
import { ColumnDef } from "@tanstack/react-table";
import Big from "big.js";
import Link from "next/link";

export const transactionHistoryColumns: ColumnDef<TransactionHistory, any>[] = [
  {
    accessorKey: "date",
    header: "Date & Time",
    accessorFn: (row) =>
      typeof row.date === "string"
        ? new Date(row.date).toLocaleString()
        : row.date.toLocaleString(),
  },
  {
    accessorKey: "value",
    header: "Amount (BTC)",
    accessorFn: (row) =>
      new BTC("sats", Big(row.value)).convert("BTC").toString(),
  },
  {
    accessorKey: "type",
    header: "Type",
  },
  {
    accessorKey: "fromTag",
    header: "From Account",
    accessorFn: (row) =>
      row.fromTag === "main" ? "Trading Account" : row.fromTag,
  },
  {
    accessorKey: "toTag",
    header: "To Account",
    accessorFn: (row) => (row.toTag === "main" ? "Trading Account" : row.toTag),
  },
  {
    accessorKey: "tx_hash",
    header: "Transaction Hash",
    cell: (row) => (
      <Button className="justify-end" asChild variant="link">
        <Link
          href={`https://nyks.twilight-explorer.com/transaction/${row.getValue()}`}
          target="_blank"
        >
          {row.getValue()}
        </Link>
      </Button>
    ),
  },
];
