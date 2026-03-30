"use client";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/popover";
import Button from "@/components/button";
import cn from "@/lib/cn";
import { formatSatsCompact, truncateHash } from "@/lib/helpers";
import { AccountLedgerEntry } from "@/lib/types";
import { ColumnDef } from "@tanstack/react-table";
import Big from "big.js";
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import React from "react";

function formatDate(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleString();
}

export type LedgerDisplayUnit = "auto" | "SATS" | "mBTC" | "BTC";

function formatWithPrecision(value: Big, decimals: number): string {
  const out = value.toFixed(decimals).replace(/\.?0+$/, "");
  if (out === "" || out === "-0") return "0";
  return out;
}

function formatBalance(value: number | null, unit: LedgerDisplayUnit = "auto") {
  if (value == null) return "—";
  if (unit === "auto") return formatSatsCompact(value);

  const sats = Big(value);
  if (unit === "SATS") {
    return `${formatWithPrecision(sats, 0)} sats`;
  }
  if (unit === "mBTC") {
    return `${formatWithPrecision(sats.div(100_000), 3)} mBTC`;
  }
  return `${formatWithPrecision(sats.div(100_000_000), 6)} BTC`;
}

function formatType(type: string) {
  return type
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatAccountWithType(value: string) {
  const separatorIndex = value.lastIndexOf("-");
  if (separatorIndex <= 0 || separatorIndex === value.length - 1) {
    return value;
  }

  const address = value.slice(0, separatorIndex);
  const accountType = value.slice(separatorIndex + 1);
  const shortAddress =
    address.length > 6
      ? `${address.slice(0, 6)}...${address.slice(-6)}`
      : address;

  return `${shortAddress}-${accountType}`;
}

export interface AccountLedgerTableMeta {
  toast: (options: { title: string; description?: string }) => void;
  displayUnit: LedgerDisplayUnit;
}

function CopyableCell({
  displayValue,
  fullValue,
  onCopy,
}: {
  displayValue: string;
  fullValue: string;
  onCopy: () => void;
}) {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="block max-w-[230px] cursor-pointer truncate text-left underline-offset-2 hover:underline"
          onClick={onCopy}
          onMouseEnter={() => setIsOpen(true)}
          onMouseLeave={() => setIsOpen(false)}
        >
          {displayValue}
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto max-w-[420px] break-all px-3 py-2 text-xs"
        side="top"
        align="start"
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
      >
        {fullValue}
      </PopoverContent>
    </Popover>
  );
}

/** Column IDs that cannot be hidden via the column filter. */
export const MANDATORY_COLUMNS = new Set([
  "timestamp",
  "type",
  "amount_sats",
  "from_acc",
  "to_acc",
  "status",
  "tx_hash",
]);

/** Column IDs hidden by default (user can enable them). */
export const DEFAULT_HIDDEN_COLUMNS = new Set([
  "id",
  "remarks",
  "fund_bal_before",
  "fund_bal_after",
  "trade_bal_before",
  "trade_bal_after",
  "t_positions_bal_before",
  "t_positions_bal_after",
  "l_deposits_bal_before",
  "l_deposits_bal_after",
  "idempotency_key",
  "created_at",
  "updated_at",
]);

function SnapshotCell({
  after,
  before,
  unit,
}: {
  after: number | null;
  before: number | null;
  unit: LedgerDisplayUnit;
}) {
  const [isOpen, setIsOpen] = React.useState(false);
  const afterLabel = formatBalance(after, unit);
  const beforeLabel = formatBalance(before, unit);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <span
          className="inline-block cursor-help"
          onMouseEnter={() => setIsOpen(true)}
          onMouseLeave={() => setIsOpen(false)}
        >
          {afterLabel}
        </span>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto max-w-[260px] px-3 py-2 text-xs"
        side="top"
        align="start"
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
      >
        <div className="space-y-1">
          <div>Before: {beforeLabel}</div>
          <div>After: {afterLabel}</div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export const accountLedgerColumns: ColumnDef<AccountLedgerEntry, any>[] = [
  {
    accessorKey: "id",
    header: "Ledger ID",
    cell: (row) => {
      const id = row.getValue() as string;
      return (
        <span className="block max-w-[180px] truncate" title={id}>
          {truncateHash(id, 8, 8)}
        </span>
      );
    },
  },
  {
    accessorKey: "timestamp",
    header: "Date & Time",
    accessorFn: (row) =>
      row.timestamp instanceof Date ? row.timestamp : new Date(row.timestamp),
    cell: (row) => formatDate(row.row.original.timestamp),
  },
  {
    accessorKey: "type",
    header: "Type",
    accessorFn: (row) => formatType(row.type),
  },
  {
    accessorKey: "order_id",
    header: "Order ID",
    cell: (row) => {
      const orderId = row.getValue() as string | null;
      if (!orderId) {
        return <span className="text-primary-accent">—</span>;
      }
      const meta = row.table.options.meta as AccountLedgerTableMeta;
      return (
        <CopyableCell
          displayValue={truncateHash(orderId, 6, 6)}
          fullValue={orderId}
          onCopy={() => {
            meta?.toast({
              title: "Copied to clipboard",
              description: "Order ID copied to clipboard",
            });
            navigator.clipboard.writeText(orderId);
          }}
        />
      );
    },
  },
  {
    accessorKey: "amount_sats",
    header: "Amount",
    cell: (row) => {
      const meta = row.table.options.meta as AccountLedgerTableMeta;
      return formatBalance(row.row.original.amount_sats, meta?.displayUnit);
    },
  },
  {
    accessorKey: "from_acc",
    header: "From Account-Type",
    cell: (row) => {
      const rawValue = row.getValue() as string;
      const meta = row.table.options.meta as AccountLedgerTableMeta;
      return (
        <CopyableCell
          displayValue={formatAccountWithType(rawValue)}
          fullValue={rawValue}
          onCopy={() => {
            meta?.toast({
              title: "Copied to clipboard",
              description: "From account copied to clipboard",
            });
            navigator.clipboard.writeText(rawValue);
          }}
        />
      );
    },
  },
  {
    accessorKey: "to_acc",
    header: "To Account-Type",
    cell: (row) => {
      const rawValue = row.getValue() as string;
      const meta = row.table.options.meta as AccountLedgerTableMeta;
      return (
        <CopyableCell
          displayValue={formatAccountWithType(rawValue)}
          fullValue={rawValue}
          onCopy={() => {
            meta?.toast({
              title: "Copied to clipboard",
              description: "To account copied to clipboard",
            });
            navigator.clipboard.writeText(rawValue);
          }}
        />
      );
    },
  },
  {
    accessorKey: "fund_bal",
    header: "Fund Bal",
    cell: (row) => {
      const meta = row.table.options.meta as AccountLedgerTableMeta;
      return (
        <SnapshotCell
          after={row.row.original.fund_bal_after}
          before={row.row.original.fund_bal_before}
          unit={meta?.displayUnit || "auto"}
        />
      );
    },
  },
  {
    accessorKey: "fund_bal_before",
    header: "Fund Bal Before",
    cell: (row) => {
      const meta = row.table.options.meta as AccountLedgerTableMeta;
      return formatBalance(row.row.original.fund_bal_before, meta?.displayUnit);
    },
  },
  {
    accessorKey: "fund_bal_after",
    header: "Fund Bal After",
    cell: (row) => {
      const meta = row.table.options.meta as AccountLedgerTableMeta;
      return formatBalance(row.row.original.fund_bal_after, meta?.displayUnit);
    },
  },
  {
    accessorKey: "trade_bal",
    header: "Trade Bal",
    cell: (row) => {
      const meta = row.table.options.meta as AccountLedgerTableMeta;
      return (
        <SnapshotCell
          after={row.row.original.trade_bal_after}
          before={row.row.original.trade_bal_before}
          unit={meta?.displayUnit || "auto"}
        />
      );
    },
  },
  {
    accessorKey: "trade_bal_before",
    header: "Trade Bal Before",
    cell: (row) => {
      const meta = row.table.options.meta as AccountLedgerTableMeta;
      return formatBalance(
        row.row.original.trade_bal_before,
        meta?.displayUnit
      );
    },
  },
  {
    accessorKey: "trade_bal_after",
    header: "Trade Bal After",
    cell: (row) => {
      const meta = row.table.options.meta as AccountLedgerTableMeta;
      return formatBalance(row.row.original.trade_bal_after, meta?.displayUnit);
    },
  },
  {
    accessorKey: "t_positions_bal",
    header: "T.Pos Bal",
    cell: (row) => {
      const meta = row.table.options.meta as AccountLedgerTableMeta;
      return (
        <SnapshotCell
          after={row.row.original.t_positions_bal_after}
          before={row.row.original.t_positions_bal_before}
          unit={meta?.displayUnit || "auto"}
        />
      );
    },
  },
  {
    accessorKey: "t_positions_bal_before",
    header: "T.Pos Bal Before",
    cell: (row) => {
      const meta = row.table.options.meta as AccountLedgerTableMeta;
      return formatBalance(
        row.row.original.t_positions_bal_before,
        meta?.displayUnit
      );
    },
  },
  {
    accessorKey: "t_positions_bal_after",
    header: "T.Pos Bal After",
    cell: (row) => {
      const meta = row.table.options.meta as AccountLedgerTableMeta;
      return formatBalance(
        row.row.original.t_positions_bal_after,
        meta?.displayUnit
      );
    },
  },
  {
    accessorKey: "l_deposits_bal",
    header: "L.Dep Bal",
    cell: (row) => {
      const meta = row.table.options.meta as AccountLedgerTableMeta;
      return (
        <SnapshotCell
          after={row.row.original.l_deposits_bal_after}
          before={row.row.original.l_deposits_bal_before}
          unit={meta?.displayUnit || "auto"}
        />
      );
    },
  },
  {
    accessorKey: "l_deposits_bal_before",
    header: "L.Dep Bal Before",
    cell: (row) => {
      const meta = row.table.options.meta as AccountLedgerTableMeta;
      return formatBalance(
        row.row.original.l_deposits_bal_before,
        meta?.displayUnit
      );
    },
  },
  {
    accessorKey: "l_deposits_bal_after",
    header: "L.Dep Bal After",
    cell: (row) => {
      const meta = row.table.options.meta as AccountLedgerTableMeta;
      return formatBalance(
        row.row.original.l_deposits_bal_after,
        meta?.displayUnit
      );
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: (row) => {
      const status = row.getValue() as string;
      return (
        <span
          className={cn(
            "rounded px-2 py-1 text-[11px] font-medium",
            status === "confirmed"
              ? "bg-green-medium/10 text-green-medium"
              : status === "cancelled"
                ? "bg-theme/10 text-theme"
                : status === "failed"
                  ? "bg-red/10 text-red"
                  : "bg-orange/10 text-orange"
          )}
        >
          {status}
        </span>
      );
    },
  },
  {
    accessorKey: "remarks",
    header: "Remarks",
    cell: (row) => {
      const remarks = row.getValue() as string | null;
      if (!remarks) {
        return <span className="text-primary-accent">—</span>;
      }
      return (
        <span className="block max-w-[220px] truncate" title={remarks}>
          {remarks}
        </span>
      );
    },
  },
  {
    accessorKey: "tx_hash",
    header: "Transaction Hash",
    cell: (row) => {
      const txHash = row.getValue() as string | null;
      if (!txHash) {
        return <span className="text-primary-accent">—</span>;
      }

      return (
        <Button
          className="items-start justify-end gap-0"
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
  {
    accessorKey: "idempotency_key",
    header: "Idempotency Key",
    cell: (row) => {
      const key = row.getValue() as string;
      return (
        <span className="block max-w-[240px] truncate" title={key}>
          {key}
        </span>
      );
    },
  },
  {
    accessorKey: "created_at",
    header: "Created At",
    accessorFn: (row) => formatDate(row.created_at),
  },
  {
    accessorKey: "updated_at",
    header: "Updated At",
    accessorFn: (row) => formatDate(row.updated_at),
  },
];
