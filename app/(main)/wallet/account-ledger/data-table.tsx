"use client";

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
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  SlidersHorizontal,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  DEFAULT_HIDDEN_COLUMNS,
  MANDATORY_COLUMNS,
  type AccountLedgerTableMeta,
  type LedgerDisplayUnit,
} from "./columns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/dialog";

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

  return (
    <div className="w-full">
      <div className="flex items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-medium text-primary-accent">Units</span>
          <Select
            value={displayUnit}
            onValueChange={(value) => setDisplayUnit(value as LedgerDisplayUnit)}
          >
            <SelectTrigger className="h-7 w-[140px] rounded px-2 py-1 text-[11px]">
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
          className="flex items-center gap-1.5 rounded px-2 py-1 text-[11px] font-medium text-primary-accent transition-colors hover:bg-theme/20 hover:text-primary"
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
        className="overflow-x-auto"
        style={{ minHeight: `${pagination.pageSize * 34 + 20}px` }}
      >
        <table cellSpacing={0} className="relative min-w-[1200px] w-full">
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
              <tr>
                <td
                  colSpan={Math.max(table.getVisibleFlatColumns().length, 1)}
                  className="h-24 px-2 py-2 text-center text-xs text-primary-accent"
                >
                  No ledger entries yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {table.getPageCount() > 1 && (
        <div className="flex items-center justify-between pt-3 text-xs text-primary-accent">
          <span className="font-ui">
            {table.getFilteredRowModel().rows.length} ledger entries
          </span>
          <div className="flex items-center gap-2">
            <button
              className="rounded-full border border-outline p-1 transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-30"
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
              className="rounded-full border border-outline p-1 transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-30"
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
