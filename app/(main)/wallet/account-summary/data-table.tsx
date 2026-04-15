"use client";

import Button from "@/components/button";
import { EmptyState, TableEmptyRow } from "@/components/empty-state";
import { ToastProps } from "@/components/toast";
import cn from "@/lib/cn";
import { useToast } from "@/lib/hooks/useToast";
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
import dayjs from "dayjs";
import { formatSatsCompact, truncateHash } from "@/lib/helpers";
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

interface AccountSummaryDataTableProps<TData, TValue> extends DataTableProps<
  TData,
  TValue
> {
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
  const [transferringAddress, setTransferringAddress] = useState<string | null>(
    null
  );
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const { toast } = useToast();

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const wrappedTransfer = useCallback(
    async (address: string) => {
      setTransferringAddress(address);
      try {
        await subaccountTransfer(address);
      } finally {
        setTransferringAddress(null);
      }
    },
    [subaccountTransfer]
  );

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
      <div className="hidden overflow-x-auto md:block">
        <table cellSpacing={0} className="relative w-full min-w-[640px]">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr
                className="border-outline/10 border-b text-xs font-normal text-primary-accent"
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
                        "whitespace-nowrap px-2 py-2",
                        index === row.getVisibleCells().length - 1
                          ? "text-end"
                          : "text-start"
                      )}
                      key={cell.id}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <TableEmptyRow
                colSpan={columns.length}
                title="No active accounts."
              />
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile cards — hidden on desktop */}
      <div className="space-y-2.5 px-1 py-2 md:hidden">
        {table.getRowModel().rows?.length ? (
          table.getRowModel().rows.map((row) => {
            const account = row.original as ActiveAccount;
            const isExpanded = expandedIds.has(row.id);
            const isTransferring = transferringAddress === account.address;
            const btcBalance = formatSatsCompact(account.value || 0);
            const createdDate = account.createdAt
              ? dayjs.unix(account.createdAt).format("DD/MM/YY HH:mm")
              : "—";
            const canTransfer = canTransferActiveAccount(account);
            const status = getActiveAccountStatus(account);
            const statusCls = getActiveAccountStatusClass(status);
            const hasTxHash = !!account.txHash && account.utilized;

            return (
              <div
                key={row.id}
                className="border-border/70 hover:border-border rounded-xl border bg-background/90 shadow-sm transition-all duration-150 hover:-translate-y-[1px] hover:shadow-md"
              >
                <div className="px-3 py-2.5">
                  {/* Header: status badge (left) + created date (right) */}
                  <div className="mb-2.5 flex items-center justify-between gap-2">
                    <span
                      className={cn(
                        "shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium",
                        statusCls
                      )}
                    >
                      {status}
                    </span>
                    <span className="truncate text-[10px] text-primary/40">
                      {createdDate}
                    </span>
                  </div>

                  {/* Primary: tag label (left) + balance (right) */}
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <span className="min-w-0 truncate text-sm font-medium text-primary">
                      {account.tag}
                    </span>
                    <span className="shrink-0 text-sm font-semibold tabular-nums text-primary">
                      {btcBalance}
                    </span>
                  </div>

                  {/* Address */}
                  <div className="font-mono mb-2.5 text-[10px] text-primary/40">
                    {truncateHash(account.address)}
                  </div>

                  {/* CTA: Transfer to Funding — only for Action Required accounts */}
                  {canTransfer && (
                    <div className="mb-2.5">
                      <Button
                        type="button"
                        variant="ui"
                        size="small"
                        className="border-blue-500/35 bg-blue-500/[0.14] text-blue-200 hover:border-blue-400/55 hover:bg-blue-500/[0.2] hover:text-blue-100 min-h-[36px] w-full gap-1.5 px-3 text-[11px]"
                        disabled={isTransferring}
                        onClick={() => wrappedTransfer(account.address)}
                      >
                        {isTransferring
                          ? "Transferring…"
                          : "Transfer to Funding"}
                      </Button>
                    </div>
                  )}

                  {/* TX footer — only when tx hash is available */}
                  {hasTxHash && (
                    <div className="border-outline/[0.08] border-t pt-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] text-primary/40">Tx</span>
                        <Link
                          href={`${process.env.NEXT_PUBLIC_EXPLORER_URL as string}/txs/${account.txHash}`}
                          target="_blank"
                          className="inline-flex items-center gap-1 text-[10px] text-primary/40 underline-offset-2 hover:text-primary/60 hover:underline"
                        >
                          {truncateHash(account.txHash)}
                          <ArrowUpRight className="h-3 w-3" />
                        </Link>
                      </div>
                    </div>
                  )}

                  {/* Expand toggle */}
                  <button
                    type="button"
                    className="mt-1.5 flex min-h-[40px] w-full items-center gap-1 text-xs text-primary-accent/60 transition-colors hover:text-primary-accent"
                    onClick={() => toggleExpand(row.id)}
                  >
                    {isExpanded ? (
                      <ChevronUp className="h-3 w-3" />
                    ) : (
                      <ChevronDown className="h-3 w-3" />
                    )}
                    {isExpanded ? "Hide details" : "Details"}
                  </button>

                  {/* Expandable section */}
                  {isExpanded && (
                    <div className="mt-1 space-y-2.5 rounded-lg bg-primary/[0.02] px-3 py-3 text-xs">
                      {status === "Action Required" && (
                        <div>
                          <span className="block text-[10px] uppercase tracking-wide text-primary-accent/60">
                            Note
                          </span>
                          <p className="mt-0.5 text-primary/80">
                            {ACTION_REQUIRED_MESSAGE}
                          </p>
                        </div>
                      )}
                      <div>
                        <span className="block text-[10px] uppercase tracking-wide text-primary-accent/60">
                          Address
                        </span>
                        <button
                          type="button"
                          className="font-mono mt-0.5 break-all text-left text-primary/80 transition-colors hover:text-primary hover:underline"
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
                      {hasTxHash && (
                        <div>
                          <span className="block text-[10px] uppercase tracking-wide text-primary-accent/60">
                            TxHash
                          </span>
                          <Link
                            href={`${process.env.NEXT_PUBLIC_EXPLORER_URL as string}/txs/${account.txHash}`}
                            target="_blank"
                            className="mt-0.5 inline-flex items-center gap-1 text-primary/80 underline-offset-2 hover:underline"
                          >
                            {truncateHash(account.txHash)}
                            <ArrowUpRight className="h-3 w-3" />
                          </Link>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <EmptyState title="No active accounts." />
        )}
      </div>
    </div>
  );
}
