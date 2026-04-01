"use client";

import { ToastProps } from '@/components/toast';
import cn from "@/lib/cn";
import { useToast } from '@/lib/hooks/useToast';
import {
  ColumnDef,
  SortingState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useCallback, useState } from "react";
import { ChevronDown, ChevronUp, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import BTC from "@/lib/twilight/denoms";
import Big from "big.js";
import dayjs from "dayjs";
import { truncateHash } from "@/lib/helpers";
import { ActiveAccount } from "../page";
import {
  ACTION_REQUIRED_MESSAGE,
  canTransferActiveAccount,
  getActiveAccountStatus,
  getActiveAccountStatusClass,
} from "./status";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
}

export interface AccountSummaryTableMeta {
  toast: (options: any) => void;
  subaccountTransfer: (address: string) => Promise<void>;
  isTransferring: (address: string) => boolean;
}

interface AccountSummaryDataTableProps<TData, TValue> extends DataTableProps<TData, TValue> {
  subaccountTransfer: (address: string) => Promise<any>;
}

export function AccountSummaryDataTable<TData, TValue>({
  columns,
  data,
  subaccountTransfer,
}: AccountSummaryDataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "createdAt", desc: true },
  ]);
  const [transferringAddress, setTransferringAddress] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const { toast } = useToast();

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const wrappedTransfer = useCallback(async (address: string) => {
    setTransferringAddress(address);
    try {
      await subaccountTransfer(address);
    } finally {
      setTransferringAddress(null);
    }
  }, [subaccountTransfer]);

  const tableMeta: AccountSummaryTableMeta = {
    toast,
    subaccountTransfer: wrappedTransfer,
    isTransferring: (address: string) => transferringAddress === address,
  };

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    initialState: {
      sorting,
    },
    getSortedRowModel: getSortedRowModel(),
    meta: tableMeta,
  });

  return (
    <div className="w-full">
      {/* Desktop table — hidden on mobile */}
      <div className="hidden md:block overflow-x-auto">
        <table
          cellSpacing={0}
          className="relative min-w-[640px] w-full"
        >
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr
                className="text-xs font-normal text-primary-accent border-b border-outline/10"
                key={headerGroup.id}
              >
                {headerGroup.headers.map((header, index) => {
                  return (
                    <th
                      className={cn(
                        "px-2 py-2 font-medium",
                        index === headerGroup.headers.length - 1
                          ? "text-end"
                          : "text-start"
                      )}
                      key={header.id}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <tr
                  className="text-xs transition-colors hover:bg-theme/20 data-[state=selected]:bg-theme"
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell, index) => (
                    <td
                      className={cn(
                        "px-2 py-2 whitespace-nowrap",
                        index === row.getVisibleCells().length - 1
                          ? "text-end"
                          : "text-start"
                      )}
                      key={cell.id}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={columns.length}
                  className="h-24 px-2 py-2 text-center text-xs text-primary-accent"
                >
                  No active accounts.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile list — hidden on desktop */}
      <div className="md:hidden">
        {table.getRowModel().rows?.length ? (
          table.getRowModel().rows.map((row) => {
            const account = row.original as ActiveAccount;
            const isExpanded = expandedIds.has(row.id);
            const isTransferring = transferringAddress === account.address;
            const btcBalance = new BTC("sats", Big(account.value || 0)).convert("BTC").toFixed(8);
            const createdDate = account.createdAt
              ? dayjs.unix(account.createdAt).format("DD/MM/YYYY")
              : "—";
            const canTransfer = canTransferActiveAccount(account);
            const status = getActiveAccountStatus(account);
            const statusCls = getActiveAccountStatusClass(status);
            const hasTxHash = !!account.txHash && account.utilized;

            return (
              <div key={row.id} className="border-b border-border/40 py-3">
                {/* Primary: truncated address + balance */}
                <div className="flex items-start justify-between gap-2">
                  <span className="font-mono text-sm text-primary">
                    {truncateHash(account.address)}
                  </span>
                  <span className="shrink-0 text-sm tabular-nums text-primary">
                    {btcBalance} BTC
                  </span>
                </div>

                {/* Secondary: 2×2 metadata grid */}
                <div className="mt-2 grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 text-xs">
                  <span className="min-w-0 text-primary-accent">{account.tag}</span>
                  <span
                    className={cn(
                      "justify-self-end rounded px-1.5 py-0.5 text-[11px] font-medium",
                      statusCls
                    )}
                  >
                    {status}
                  </span>
                  <span className="min-w-0 text-primary-accent">Created: {createdDate}</span>
                </div>

                {/* Actions */}
                {canTransfer && (
                  <div className="mt-2 flex justify-end">
                    <button
                      type="button"
                      className="flex min-h-[44px] items-center rounded border border-outline px-3 text-xs font-medium text-primary transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
                      disabled={isTransferring}
                      onClick={() => wrappedTransfer(account.address)}
                    >
                      {isTransferring ? "Transferring…" : "Transfer →"}
                    </button>
                  </div>
                )}

                {/* Expand toggle */}
                <button
                  type="button"
                  className="mt-1 flex min-h-[44px] items-center gap-1 text-xs text-primary-accent/60 transition-colors hover:text-primary-accent"
                  onClick={() => toggleExpand(row.id)}
                >
                  {isExpanded ? (
                    <ChevronUp className="h-3 w-3" />
                  ) : (
                    <ChevronDown className="h-3 w-3" />
                  )}
                  Details
                </button>

                {/* Expandable section */}
                {isExpanded && (
                  <div className="mt-1 space-y-2 rounded-lg bg-primary/[0.02] px-3 py-2.5 text-xs">
                    {status === "Action Required" && (
                      <div>
                        <span className="block text-[10px] uppercase tracking-wide text-primary-accent/60">
                          Status
                        </span>
                        <p className="mt-0.5 text-primary/80">{ACTION_REQUIRED_MESSAGE}</p>
                      </div>
                    )}
                    <div>
                      <span className="block text-[10px] uppercase tracking-wide text-primary-accent/60">
                        Address
                      </span>
                      <button
                        type="button"
                        className="mt-0.5 break-all text-left font-mono text-primary/80 transition-colors hover:text-primary hover:underline"
                        onClick={() => {
                          navigator.clipboard.writeText(account.address);
                          toast({
                            title: "Copied to clipboard",
                            description: `${account.tag} address copied to clipboard`,
                          });
                        }}
                      >
                        {account.address}
                      </button>
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase tracking-wide text-primary-accent/60">
                        TxHash
                      </span>
                      {hasTxHash ? (
                        <Link
                          href={`${process.env.NEXT_PUBLIC_EXPLORER_URL as string}/txs/${account.txHash}`}
                          target="_blank"
                          className="mt-0.5 inline-flex items-center gap-1 text-primary/80 underline-offset-2 hover:underline"
                        >
                          {truncateHash(account.txHash)}
                          <ArrowUpRight className="h-3 w-3" />
                        </Link>
                      ) : (
                        <span className="mt-0.5 block text-primary-accent">—</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="py-10 text-center text-xs text-primary-accent">
            No active accounts.
          </div>
        )}
      </div>
    </div>
  );
}
