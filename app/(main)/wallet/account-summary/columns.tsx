"use client";

import Button from "@/components/button";
import { ColumnDef } from "@tanstack/react-table";
import dayjs from "dayjs";
import { formatSatsCompact, truncateHash } from "@/lib/helpers";
import { AccountSummaryTableMeta } from "./data-table";
import { ActiveAccount } from "../page";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import cn from "@/lib/cn";
import { Tooltip } from "@/components/tooltip";
import {
  ACTION_REQUIRED_MESSAGE,
  canTransferActiveAccount,
  getActiveAccountStatus,
  getActiveAccountStatusClass,
} from "./status";

export const accountSummaryColumns: ColumnDef<ActiveAccount, any>[] = [
  {
    accessorKey: "createdAt",
    header: "Created",
    accessorFn: (row) =>
      row.createdAt ? dayjs.unix(row.createdAt).format("DD/MM/YYYY HH:mm") : "",
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
    accessorKey: "value",
    header: "Balance",
    cell: (row) => (
      <span className="font-medium tabular-nums">
        {formatSatsCompact(row.row.original.value || 0)}
      </span>
    ),
  },
  {
    id: "status",
    header: "Status",
    cell: (ctx) => {
      const status = getActiveAccountStatus(ctx.row.original);
      const cls = getActiveAccountStatusClass(status);
      const pill = (
        <span
          className={cn("rounded px-1.5 py-0.5 text-[11px] font-medium", cls)}
        >
          {status}
        </span>
      );

      if (
        status === "Action Required" &&
        canTransferActiveAccount(ctx.row.original)
      ) {
        return (
          <Tooltip title={status} body={ACTION_REQUIRED_MESSAGE}>
            {pill}
          </Tooltip>
        );
      }

      return pill;
    },
  },
  {
    accessorKey: "tag",
    header: "Label",
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
          className="items-center justify-start gap-0"
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
    header: "Actions",
    cell: (ctx) => {
      const row = ctx.row;
      if (
        row.original.utilized ||
        row.original.tag === "Primary Trading Account" ||
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
