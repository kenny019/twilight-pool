"use client";

import Button from "@/components/button";
import { formatSatsCompact, truncateHash } from "@/lib/helpers";
import { TransactionHistory } from "@/lib/types";
import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import dayjs from "dayjs";

export function convertDate(toParse: Date | string) {
  return typeof toParse === "string" ? new Date(toParse) : toParse;
}

export const transactionHistoryColumns: ColumnDef<TransactionHistory, any>[] = [
  {
    accessorKey: "date",
    header: "Date & Time",
    accessorFn: (row) =>
      dayjs(convertDate(row.date)).format("DD/MM/YYYY HH:mm"),
  },
  {
    id: "value",
    header: "Amount",
    accessorFn: (row) => row.value,
    sortingFn: "basic",
    cell: (row) => (
      <span className="font-medium tabular-nums">
        {formatSatsCompact(row.row.original.value)}
      </span>
    ),
  },
  {
    accessorKey: "type",
    header: "Type",
    cell: (row) => (
      <span className="font-medium">{row.getValue() as string}</span>
    ),
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
    accessorFn: (row) =>
      row.toTag === "main" ? "Primary Trading Account" : row.toTag,
  },
  {
    accessorKey: "tx_hash",
    header: "Transaction Hash",
    cell: (row) => {
      const txHash = row.getValue() as string | null;
      if (!txHash) return <span className="text-primary-accent">—</span>;
      return (
        <Button
          className="items-center justify-start gap-0"
          asChild
          variant="link"
        >
          <Link
            href={`${process.env.NEXT_PUBLIC_EXPLORER_URL as string}/txs/${txHash}`}
            target="_blank"
          >
            {truncateHash(txHash)} <ArrowUpRight className="h-3 w-3" />
          </Link>
        </Button>
      );
    },
  },
];
