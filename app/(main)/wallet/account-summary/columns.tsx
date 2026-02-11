"use client";

import Button from "@/components/button";
import BTC from "@/lib/twilight/denoms";
import { ColumnDef } from "@tanstack/react-table";
import Big from "big.js";
import dayjs from "dayjs";
import { truncateHash } from '@/lib/helpers';
import { AccountSummaryTableMeta } from './data-table';
import { ActiveAccount } from '../page';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';

export const accountSummaryColumns: ColumnDef<ActiveAccount, any>[] = [
  {
    accessorKey: "createdAt",
    header: "Created",
    accessorFn: (row) => row.createdAt ? dayjs.unix(row.createdAt).format("DD/MM/YYYY HH:mm:ss") : "",
  },
  {
    accessorKey: "tag",
    header: "Account Tag",
  },
  {
    accessorKey: "address",
    header: "Address",
    cell: (row) => (
      <Button onClick={(e) => {
        const meta = row.table.options.meta as AccountSummaryTableMeta;
        e.preventDefault();
        meta.toast({
          title: "Copied to clipboard",
          description: `${row.row.original.tag} address copied to clipboard`,
        })
        navigator.clipboard.writeText(row.getValue());
      }} variant="link">
        {truncateHash(row.getValue() as string)}
      </Button>
    )
  },
  {
    accessorKey: "txHash",
    header: "TxHash",
    cell: (row) => {
      const utilized = row.row.original.utilized;
      const txHash = row.row.original.txHash;
      if (!txHash || !utilized) return <span className="text-primary-accent">-</span>;

      return (
        <Button className="justify-start gap-0 items-start" asChild variant="link">
          <Link
            href={`${process.env.NEXT_PUBLIC_EXPLORER_URL as string}/txs/${txHash}`}
            target="_blank"
            className="relative"
          >
            {truncateHash(txHash)} <ArrowUpRight className="h-3 w-3" />
          </Link>
        </Button>
      )

    }
  },

  {
    accessorKey: "value",
    header: "Balance (BTC)",
    accessorFn: (row) =>
      new BTC("sats", Big(row.value || 0)).convert("BTC").toFixed(8)
  },
  {
    accessorKey: "type",
    header: "Type",
  },
  {
    accessorKey: "utilized",
    header: "Utilized",
    accessorFn: (row) => row.utilized ? "Yes" : "No"
  }
  // {
  //   header: "Actions",
  //   cell: (row) => {

  //   }
  // }
];
