"use client";

import Button from "@/components/button";
import BTC from "@/lib/twilight/denoms";
import { ColumnDef } from "@tanstack/react-table";
import Big from "big.js";
import dayjs from "dayjs";
import { truncateHash } from "@/lib/helpers";
import { AccountSummaryTableMeta } from "./data-table";
import { ActiveAccount } from "../page";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Tooltip } from "@/components/tooltip";

export const accountSummaryColumns: ColumnDef<ActiveAccount, any>[] = [
  {
    accessorKey: "createdAt",
    header: "Created",
    accessorFn: (row) =>
      row.createdAt
        ? dayjs.unix(row.createdAt).format("DD/MM/YYYY HH:mm:ss")
        : "",
  },
  {
    accessorKey: "tag",
    header: "Account Tag",
  },
  {
    accessorKey: "address",
    header: "Address",
    cell: (row) => (
      <Button
        onClick={(e) => {
          const meta = row.table.options.meta as AccountSummaryTableMeta;
          e.preventDefault();
          meta.toast({
            title: "Copied to clipboard",
            description: `${row.row.original.tag} address copied to clipboard`,
          });
          navigator.clipboard.writeText(row.getValue());
        }}
        variant="link"
      >
        {truncateHash(row.getValue() as string)}
      </Button>
    ),
  },
  {
    accessorKey: "txHash",
    header: "TxHash",
    cell: (row) => {
      const utilized = row.row.original.utilized;
      const txHash = row.row.original.txHash;
      if (!txHash || !utilized)
        return <span className="text-primary-accent">-</span>;

      return (
        <Button
          className="items-start justify-start gap-0"
          asChild
          variant="link"
        >
          <Link
            href={`${process.env.NEXT_PUBLIC_EXPLORER_URL as string}/txs/${txHash}`}
            target="_blank"
            className="relative"
          >
            {truncateHash(txHash)} <ArrowUpRight className="h-3 w-3" />
          </Link>
        </Button>
      );
    },
  },

  {
    accessorKey: "value",
    header: "Balance (BTC)",
    accessorFn: (row) =>
      new BTC("sats", Big(row.value || 0)).convert("BTC").toFixed(8),
  },
  {
    accessorKey: "type",
    header: "Type",
  },
  {
    accessorKey: "utilized",
    header: () => (
      <Tooltip
        title="Allocated"
        body="Funds currently used in trades and lending"
      >
        <span>Allocated</span>
      </Tooltip>
    ),
    accessorFn: (row) => (row.utilized ? "Yes" : "No"),
  },
  {
    header: "Actions",
    cell: (ctx) => {
      const row = ctx.row;
      if (
        row.original.utilized ||
        row.original.tag === "Trading Account" ||
        row.original.value === 0
      )
        return null;

      const meta = ctx.table.options.meta as AccountSummaryTableMeta;
      const isTransferring = meta.isTransferring(row.original.address);

      return (
        <div className="flex justify-end">
          <Button
            className="py-1"
            variant="ui"
            size="small"
            disabled={isTransferring}
            onClick={() => meta.subaccountTransfer(row.original.address)}
          >
            {isTransferring ? "Transferring..." : "Transfer to Funding"}
          </Button>
        </div>
      );
    },
  },
];
