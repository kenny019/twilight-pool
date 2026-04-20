"use client";

import { EmptyState, TableEmptyRow } from "@/components/empty-state";
import cn from "@/lib/cn";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/select";
import { useToast } from "@/lib/hooks/useToast";
import {
  ColumnDef,
  ColumnOrderState,
  PaginationState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  ArrowUpRight,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  SlidersHorizontal,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  DEFAULT_HIDDEN_COLUMNS,
  MANDATORY_COLUMNS,
  formatAccountWithType,
  formatBalance,
  formatDate,
  formatType,
  getLedgerStatusClass,
  type AccountLedgerTableMeta,
  type LedgerDisplayUnit,
} from "./columns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/dialog";
import { AccountLedgerEntry } from "@/lib/types";

const VISIBILITY_KEY = "account-ledger-columns";
const ORDER_KEY = "account-ledger-column-order";
const UNIT_KEY = "account-ledger-display-unit";

function getColumnId(col: ColumnDef<any, any>): string {
  return (
    (col as { id?: string }).id ??
    (col as { accessorKey?: string }).accessorKey ??
    ""
  );
}

function getColumnLabel(id: string, columns: ColumnDef<any, any>[]): string {
  const col = columns.find((c) => getColumnId(c) === id);
  if (col && typeof col.header === "string") return col.header;
  return id.replace(/_/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2");
}

function loadColumnVisibility(columns: ColumnDef<any, any>[]): VisibilityState {
  const fallback: VisibilityState = {};
  for (const col of columns) {
    const id = getColumnId(col);
    if (!id) continue;
    if (DEFAULT_HIDDEN_COLUMNS.has(id)) {
      fallback[id] = false;
    }
    if (MANDATORY_COLUMNS.has(id)) {
      fallback[id] = true;
    }
  }

  try {
    const stored = localStorage.getItem(VISIBILITY_KEY);
    if (!stored) return fallback;

    const parsed = JSON.parse(stored) as VisibilityState;
    const merged: VisibilityState = { ...fallback, ...parsed };

    for (const col of columns) {
      const id = getColumnId(col);
      if (id && MANDATORY_COLUMNS.has(id)) {
        merged[id] = true;
      }
    }

    return merged;
  } catch {
    return fallback;
  }
}

function loadColumnOrder(columns: ColumnDef<any, any>[]): ColumnOrderState {
  try {
    const stored = localStorage.getItem(ORDER_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as string[];
      const validIds = new Set(columns.map(getColumnId).filter(Boolean));
      const ordered = parsed.filter((id) => validIds.has(id));
      const missing = Array.from(validIds).filter(
        (id) => !ordered.includes(id)
      );
      return [...ordered, ...missing];
    }
  } catch {
    // ignore
  }
  return columns.map(getColumnId).filter(Boolean);
}

function saveToStorage(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

function loadDisplayUnit(): LedgerDisplayUnit {
  try {
    const stored = localStorage.getItem(UNIT_KEY);
    if (
      stored === "auto" ||
      stored === "SATS" ||
      stored === "mBTC" ||
      stored === "BTC"
    ) {
      return stored;
    }
  } catch {
    // ignore
  }
  return "auto";
}

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
}

const BALANCE_SECTIONS = [
  {
    key: "funding",
    label: "Funding",
    beforeKey: "fund_bal_before",
    afterKey: "fund_bal_after",
  },
  {
    key: "trading",
    label: "Trading",
    beforeKey: "trade_bal_before",
    afterKey: "trade_bal_after",
  },
  {
    key: "positions",
    label: "Open Positions",
    beforeKey: "t_positions_bal_before",
    afterKey: "t_positions_bal_after",
  },
  {
    key: "lend",
    label: "Lend Deposits",
    beforeKey: "l_deposits_bal_before",
    afterKey: "l_deposits_bal_after",
  },
] as const;

export function AccountLedgerDataTable<TData, TValue>({
  columns,
  data,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "timestamp", desc: true },
  ]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(
    () => loadColumnVisibility(columns)
  );
  const [columnOrder, setColumnOrder] = useState<ColumnOrderState>(() =>
    loadColumnOrder(columns)
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [displayUnit, setDisplayUnit] = useState<LedgerDisplayUnit>(() =>
    loadDisplayUnit()
  );
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  useEffect(() => {
    saveToStorage(VISIBILITY_KEY, columnVisibility);
  }, [columnVisibility]);
  useEffect(() => {
    saveToStorage(ORDER_KEY, columnOrder);
  }, [columnOrder]);
  useEffect(() => {
    saveToStorage(UNIT_KEY, displayUnit);
  }, [displayUnit]);

  const table = useReactTable({
    data,
    columns,
    meta: { toast, displayUnit } satisfies AccountLedgerTableMeta,
    state: { sorting, pagination, columnVisibility, columnOrder },
    autoResetPageIndex: false,
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnOrderChange: setColumnOrder,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const toggleColumn = useCallback((columnId: string) => {
    if (MANDATORY_COLUMNS.has(columnId)) return;
    setColumnVisibility((prev) => ({
      ...prev,
      [columnId]: prev[columnId] === false ? true : false,
    }));
  }, []);

  const moveColumn = useCallback(
    (columnId: string, direction: "up" | "down") => {
      setColumnOrder((prev) => {
        const idx = prev.indexOf(columnId);
        if (idx < 0) return prev;
        const targetIdx = direction === "up" ? idx - 1 : idx + 1;
        if (targetIdx < 0 || targetIdx >= prev.length) return prev;
        const next = [...prev];
        [next[idx], next[targetIdx]] = [next[targetIdx], next[idx]];
        return next;
      });
    },
    []
  );

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  return (
    <div className="w-full">
      <div className="flex flex-col gap-2 pb-2 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-medium text-primary-accent">
            Units
          </span>
          <Select
            value={displayUnit}
            onValueChange={(value) => setDisplayUnit(value as LedgerDisplayUnit)}
          >
            <SelectTrigger className="h-8 w-[160px] rounded px-2 py-1 text-[11px] md:h-7 md:w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">Auto (default)</SelectItem>
              <SelectItem value="SATS">SATS</SelectItem>
              <SelectItem value="mBTC">mBTC</SelectItem>
              <SelectItem value="BTC">BTC</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <button
          type="button"
          onClick={() => setDialogOpen(true)}
          className="hidden items-center gap-1.5 rounded px-2 py-1 text-[11px] font-medium text-primary-accent transition-colors hover:bg-theme/20 hover:text-primary md:flex"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Columns
        </button>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogTitle>Configure Ledger Columns</DialogTitle>
          <DialogDescription>
            Choose visible columns and reorder them. Mandatory columns cannot be
            hidden.
          </DialogDescription>

          <div className="flex max-h-[60vh] flex-col gap-1 overflow-y-auto py-1">
            {columnOrder.map((colId, idx) => {
              const isMandatory = MANDATORY_COLUMNS.has(colId);
              const isVisible = columnVisibility[colId] !== false;
              const label = getColumnLabel(colId, columns);
              const isFirst = idx === 0;
              const isLast = idx === columnOrder.length - 1;

              return (
                <div
                  key={colId}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 transition-colors",
                    isVisible ? "bg-theme/10" : "opacity-50"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={isVisible}
                    disabled={isMandatory}
                    onChange={() => toggleColumn(colId)}
                    className="border-border h-3.5 w-3.5 shrink-0 rounded accent-theme disabled:opacity-40"
                  />
                  <span className="min-w-0 flex-1 truncate text-sm">{label}</span>
                  {isMandatory ? (
                    <span className="shrink-0 text-[10px] text-primary-accent">
                      Mandatory
                    </span>
                  ) : null}
                  <div className="flex shrink-0 flex-col">
                    <button
                      type="button"
                      disabled={isFirst}
                      onClick={() => moveColumn(colId, "up")}
                      className="rounded p-0.5 text-primary-accent transition-colors hover:bg-theme/30 hover:text-primary disabled:pointer-events-none disabled:opacity-20"
                      aria-label={`Move ${label} up`}
                    >
                      <ChevronUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={isLast}
                      onClick={() => moveColumn(colId, "down")}
                      className="rounded p-0.5 text-primary-accent transition-colors hover:bg-theme/30 hover:text-primary disabled:pointer-events-none disabled:opacity-20"
                      aria-label={`Move ${label} down`}
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      <div
        className="hidden overflow-x-auto md:block"
        style={{ minHeight: `${pagination.pageSize * 34 + 20}px` }}
      >
        <table cellSpacing={0} className="relative min-w-[1120px] w-full">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr
                className="text-xs font-normal text-primary-accent"
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
                  className="h-[34px] text-xs hover:bg-theme/20 data-[state=selected]:bg-theme"
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td className="whitespace-nowrap px-2 py-2" key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <TableEmptyRow colSpan={Math.max(table.getVisibleFlatColumns().length, 1)} title="No ledger entries yet." />
            )}
          </tbody>
        </table>
      </div>

      <div className="md:hidden">
        {table.getRowModel().rows?.length ? (
          table.getRowModel().rows.map((row) => {
            const entry = row.original as AccountLedgerEntry;
            const isExpanded = expandedIds.has(row.id);
            const statusClass = getLedgerStatusClass(entry.status);
            const amountLabel = formatBalance(entry.amount_sats, displayUnit);
            const routeFrom = formatAccountWithType(entry.from_acc);
            const routeTo = formatAccountWithType(entry.to_acc);
            const visibleBalanceSections = BALANCE_SECTIONS.filter((section) => {
              const before = entry[section.beforeKey];
              const after = entry[section.afterKey];
              return before != null || after != null;
            });

            return (
              <div key={row.id} className="border-b border-border/40 py-3">
                <div className="flex items-start justify-between gap-3">
                  <span className="min-w-0 text-sm font-medium text-primary">
                    {formatType(entry.type)}
                  </span>
                  <span className="shrink-0 text-sm tabular-nums text-primary">
                    {amountLabel}
                  </span>
                </div>

                <div className="mt-1 flex items-center justify-between gap-3">
                  <span className="min-w-0 text-xs text-primary-accent">
                    {formatDate(entry.timestamp)}
                  </span>
                  <span className={statusClass}>{entry.status}</span>
                </div>

                <div className="mt-1.5 flex items-center gap-2 text-xs text-primary-accent/80">
                  <span className="min-w-0 flex-1 truncate">{routeFrom}</span>
                  <span className="shrink-0 text-primary-accent/50">→</span>
                  <span className="min-w-0 flex-1 truncate text-right">
                    {routeTo}
                  </span>
                </div>

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

                {isExpanded && (
                  <div className="mt-1 space-y-3 rounded-lg bg-primary/[0.02] px-3 py-2.5 text-xs">
                    <div className="space-y-2">
                      <div>
                        <span className="block text-[10px] uppercase tracking-wide text-primary-accent/60">
                          From
                        </span>
                        <button
                          type="button"
                          className="mt-0.5 break-all text-left text-primary/80 transition-colors hover:text-primary hover:underline"
                          onClick={() => {
                            navigator.clipboard.writeText(entry.from_acc);
                            toast({
                              title: "Copied to clipboard",
                              description: "From account copied to clipboard",
                            });
                          }}
                        >
                          {entry.from_acc}
                        </button>
                      </div>

                      <div>
                        <span className="block text-[10px] uppercase tracking-wide text-primary-accent/60">
                          To
                        </span>
                        <button
                          type="button"
                          className="mt-0.5 break-all text-left text-primary/80 transition-colors hover:text-primary hover:underline"
                          onClick={() => {
                            navigator.clipboard.writeText(entry.to_acc);
                            toast({
                              title: "Copied to clipboard",
                              description: "To account copied to clipboard",
                            });
                          }}
                        >
                          {entry.to_acc}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div>
                        <span className="block text-[10px] uppercase tracking-wide text-primary-accent/60">
                          Order ID
                        </span>
                        {entry.order_id ? (
                          <button
                            type="button"
                            className="mt-0.5 break-all text-left text-primary/80 transition-colors hover:text-primary hover:underline"
                            onClick={() => {
                              navigator.clipboard.writeText(entry.order_id!);
                              toast({
                                title: "Copied to clipboard",
                                description: "Order ID copied to clipboard",
                              });
                            }}
                          >
                            {entry.order_id}
                          </button>
                        ) : (
                          <span className="mt-0.5 block text-primary-accent">
                            —
                          </span>
                        )}
                      </div>

                      <div>
                        <span className="block text-[10px] uppercase tracking-wide text-primary-accent/60">
                          Tx Hash
                        </span>
                        {entry.tx_hash ? (
                          <div className="mt-0.5 space-y-1">
                            <button
                              type="button"
                              className="break-all text-left text-primary/80 transition-colors hover:text-primary hover:underline"
                              onClick={() => {
                                navigator.clipboard.writeText(entry.tx_hash!);
                                toast({
                                  title: "Copied to clipboard",
                                  description:
                                    "Transaction hash copied to clipboard",
                                });
                              }}
                            >
                              {entry.tx_hash}
                            </button>
                            <Link
                              href={`${process.env.NEXT_PUBLIC_EXPLORER_URL as string}/txs/${entry.tx_hash}`}
                              target="_blank"
                              className="inline-flex items-center gap-1 text-primary-accent/70 underline-offset-2 hover:text-primary hover:underline"
                            >
                              View on Explorer
                              <ArrowUpRight className="h-3 w-3" />
                            </Link>
                          </div>
                        ) : (
                          <span className="mt-0.5 block text-primary-accent">
                            —
                          </span>
                        )}
                      </div>
                    </div>

                    {entry.remarks ? (
                      <div>
                        <span className="block text-[10px] uppercase tracking-wide text-primary-accent/60">
                          Remarks
                        </span>
                        <p className="mt-0.5 text-primary/80">{entry.remarks}</p>
                      </div>
                    ) : null}

                    {visibleBalanceSections.length ? (
                      <div className="space-y-2">
                        <span className="block text-[10px] uppercase tracking-wide text-primary-accent/60">
                          Balance Impact
                        </span>
                        <div className="space-y-2">
                          {visibleBalanceSections.map((section) => (
                            <div
                              key={section.key}
                              className="flex items-start justify-between gap-3"
                            >
                              <span className="text-primary-accent/80">
                                {section.label}
                              </span>
                              <div className="text-right tabular-nums text-primary/80">
                                <div>
                                  {formatBalance(
                                    entry[section.beforeKey],
                                    displayUnit
                                  )}
                                </div>
                                <div className="text-primary-accent/60">
                                  →
                                </div>
                                <div>
                                  {formatBalance(
                                    entry[section.afterKey],
                                    displayUnit
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    <div className="space-y-2">
                      <span className="block text-[10px] uppercase tracking-wide text-primary-accent/60">
                        Audit
                      </span>

                      <div className="space-y-1 text-primary/80">
                        <div>
                          <span className="text-primary-accent/60">Created:</span>{" "}
                          {formatDate(entry.created_at)}
                        </div>
                        <div>
                          <span className="text-primary-accent/60">Updated:</span>{" "}
                          {formatDate(entry.updated_at)}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <EmptyState title="No ledger entries yet." />
        )}
      </div>

      {table.getPageCount() > 1 && (
        <div className="flex items-center justify-between pt-3 text-xs text-primary-accent">
          <span className="font-ui">
            {table.getFilteredRowModel().rows.length} ledger entries
          </span>
          <div className="flex items-center gap-2">
            <button
              className="flex min-h-[36px] min-w-[36px] items-center justify-center rounded-full border border-outline p-2 transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-30 touch-manipulation"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <span className="font-ui">
              <span className="text-theme">
                {table.getState().pagination.pageIndex + 1}
              </span>
              {" / "}
              {table.getPageCount()}
            </span>
            <button
              className="flex min-h-[36px] min-w-[36px] items-center justify-center rounded-full border border-outline p-2 transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-30 touch-manipulation"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
