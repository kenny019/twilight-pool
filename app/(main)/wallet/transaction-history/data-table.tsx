"use client";

import { EmptyState, TableEmptyRow } from "@/components/empty-state";
import cn from "@/lib/cn";
import {
  ColumnDef,
  PaginationState,
  SortingState,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ArrowUpRight,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useState } from "react";
import { formatSatsCompact } from "@/lib/helpers";
import { convertDate } from "./columns";
import { TransactionHistory } from "@/lib/types";
import dayjs from "dayjs";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
}

export function TransactionHistoryDataTable<TData, TValue>({
  columns,
  data,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "date", desc: true },
  ]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const table = useReactTable({
    data,
    columns,
    state: { sorting, pagination },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <div className="w-full">
      {/* Desktop table — hidden on mobile */}
      <div
        className="hidden overflow-x-auto md:block"
        style={{ minHeight: `${pagination.pageSize * 34 + 20}px` }}
      >
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
                  className="h-[34px] text-xs transition-colors hover:bg-theme/20 data-[state=selected]:bg-theme"
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell, index) => (
                    <td
                      className={cn("whitespace-nowrap px-2 py-2")}
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
                title="No transactions yet."
              />
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile list — hidden on desktop */}
      <div className="md:hidden">
        {table.getRowModel().rows?.length ? (
          table.getRowModel().rows.map((row) => {
            const tx = row.original as TransactionHistory;
            const isExpanded = expandedIds.has(row.id);
            const btcAmount = formatSatsCompact(tx.value);
            const dateStr = dayjs(convertDate(tx.date)).format(
              "DD/MM/YYYY HH:mm"
            );
            const fromLabel =
              tx.fromTag === "main" ? "Primary Trading Account" : tx.fromTag;
            const toLabel =
              tx.toTag === "main" ? "Primary Trading Account" : tx.toTag;
            const hasTxHash = !!tx.tx_hash;

            return (
              <div key={row.id} className="border-border/40 border-b py-3">
                {/* Primary row: type + amount */}
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-medium text-primary">
                    {tx.type}
                  </span>
                  <span className="shrink-0 text-sm tabular-nums text-primary">
                    {btcAmount}
                  </span>
                </div>

                {/* Secondary row: date */}
                <div className="mt-0.5">
                  <span className="text-xs text-primary-accent">{dateStr}</span>
                </div>

                {/* Route: labeled From / To */}
                <div className="mt-1.5 space-y-0.5 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-8 shrink-0 text-[10px] uppercase tracking-wide text-primary-accent/50">
                      From
                    </span>
                    <span className="min-w-0 truncate text-primary-accent/80">
                      {fromLabel}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-8 shrink-0 text-[10px] uppercase tracking-wide text-primary-accent/50">
                      To
                    </span>
                    <span className="min-w-0 truncate text-primary-accent/80">
                      {toLabel}
                    </span>
                  </div>
                </div>

                {/* Expand toggle — only shown when there is a tx hash to display */}
                {hasTxHash && (
                  <button
                    type="button"
                    className="mt-1 flex min-h-[44px] w-full items-center gap-1 text-xs text-primary-accent/60 transition-colors hover:text-primary-accent"
                    onClick={() => toggleExpand(row.id)}
                  >
                    {isExpanded ? (
                      <ChevronUp className="h-3 w-3" />
                    ) : (
                      <ChevronDown className="h-3 w-3" />
                    )}
                    {isExpanded ? "Hide hash" : "View hash"}
                  </button>
                )}

                {/* Expandable section */}
                {isExpanded && hasTxHash && (
                  <div className="mt-1 space-y-2 rounded-lg bg-primary/[0.02] px-3 py-2.5 text-xs">
                    <div>
                      <span className="block text-[10px] uppercase tracking-wide text-primary-accent/60">
                        Hash
                      </span>
                      <div className="mt-0.5 space-y-1">
                        <button
                          type="button"
                          className="font-mono break-all text-left text-primary/80 transition-colors hover:text-primary hover:underline"
                          onClick={() =>
                            navigator.clipboard.writeText(tx.tx_hash)
                          }
                        >
                          {tx.tx_hash}
                        </button>
                        <Link
                          href={`${process.env.NEXT_PUBLIC_EXPLORER_URL as string}/txs/${tx.tx_hash}`}
                          target="_blank"
                          className="inline-flex items-center gap-1 text-primary-accent/60 underline-offset-2 hover:text-primary hover:underline"
                        >
                          View on Explorer
                          <ArrowUpRight className="h-3 w-3" />
                        </Link>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <EmptyState title="No transactions yet." />
        )}
      </div>

      {/* Pagination — shared, shown when needed */}
      {table.getPageCount() > 1 && (
        <div className="flex items-center justify-between pt-3 text-xs text-primary-accent">
          <span className="font-ui">
            {table.getFilteredRowModel().rows.length} transactions
          </span>
          <div className="flex items-center gap-2">
            <button
              className="flex min-h-[36px] min-w-[36px] touch-manipulation items-center justify-center rounded-full border border-outline p-2 transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-30"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="font-ui">
              <span className="text-theme">
                {table.getState().pagination.pageIndex + 1}
              </span>
              {" / "}
              {table.getPageCount()}
            </span>
            <button
              className="flex min-h-[36px] min-w-[36px] touch-manipulation items-center justify-center rounded-full border border-outline p-2 transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-30"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
