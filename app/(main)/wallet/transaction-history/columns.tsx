"use client";

import Button from "@/components/button";
import { formatSatsCompact, truncateHash } from '@/lib/helpers';
import { TransactionHistory } from "@/lib/types";
import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpRight } from 'lucide-react';
import Link from "next/link";

export function convertDate(toParse: Date | string) {
  return typeof toParse === "string" ? new Date(toParse) : toParse;
}

export const transactionHistoryColumns: ColumnDef<TransactionHistory, any>[] = [
  {
    accessorKey: "date",
    header: "Date & Time",
    accessorFn: (row) => convertDate(row.date).toLocaleString(),
  },
  {
    id: "value",
    header: "Amount",
    accessorFn: (row) => row.value,
    sortingFn: "basic",
    cell: (row) => (
      <span className="tabular-nums font-medium">
        {formatSatsCompact(row.row.original.value)}
      </span>
    ),
  },
  {
    accessorKey: "type",
    header: "Type",
    cell: (row) => <span className="font-medium">{row.getValue() as string}</span>,
  },
  {
    accessorKey: "fromTag",
    header: "From Account",
    accessorFn: (row) =>
      row.fromTag === "main" ? "Primary Trading Account" : row.fromTag,
  },
  {
    accessorKey: "toTag",
    header: "To Account",
    accessorFn: (row) => (row.toTag === "main" ? "Primary Trading Account" : row.toTag),
  },
  {
    accessorKey: "tx_hash",
    header: "Transaction Hash",
    cell: (row) => (
      <Button className="justify-end gap-0 items-start" asChild variant="link">
        <Link
          href={`${process.env.NEXT_PUBLIC_EXPLORER_URL as string}/txs/${row.getValue()}`}
          target="_blank"
        >
          {truncateHash(row.getValue() as string)} <ArrowUpRight className="h-3 w-3" />
        </Link>
      </Button>
    ),
  },
];
