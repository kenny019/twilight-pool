"use client";

import cn from "@/lib/cn";
import {
  ColumnDef,
  ColumnOrderState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useCallback, useEffect, useState } from "react";
import {
  OrderHistoryTableMeta,
  MANDATORY_COLUMNS,
  DEFAULT_HIDDEN_COLUMNS,
} from "./columns";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/dialog";
import { SlidersHorizontal, ChevronUp, ChevronDown } from "lucide-react";

const VISIBILITY_KEY = "order-history-columns";
const ORDER_KEY = "order-history-column-order";

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
  return id.replace(/([a-z])([A-Z])/g, "$1 $2");
}

function loadColumnVisibility(columns: ColumnDef<any, any>[]): VisibilityState {
  try {
    const stored = localStorage.getItem(VISIBILITY_KEY);
    if (stored) return JSON.parse(stored) as VisibilityState;
  } catch {
    // ignore
  }
  const visibility: VisibilityState = {};
  for (const col of columns) {
    const id = getColumnId(col);
    if (id && DEFAULT_HIDDEN_COLUMNS.has(id)) {
      visibility[id] = false;
    }
  }
  return visibility;
}

function loadColumnOrder(columns: ColumnDef<any, any>[]): ColumnOrderState {
  try {
    const stored = localStorage.getItem(ORDER_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as string[];
      // Validate: keep only IDs that exist in columns, append any missing ones
      const validIds = new Set(columns.map(getColumnId).filter(Boolean));
      const ordered = parsed.filter((id) => validIds.has(id));
      const missing = [...validIds].filter((id) => !ordered.includes(id));
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

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  getCurrentPrice: () => number;
  getBtcPriceUsd: () => number;
  openFundingDialog: (trade: import("@/lib/types").TradeOrder) => void;
}

export function OrderHistoryDataTable<TData, TValue>({
  columns,
  data,
  getCurrentPrice,
  getBtcPriceUsd,
  openFundingDialog,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "date", desc: true },
  ]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(
    () => loadColumnVisibility(columns)
  );
  const [columnOrder, setColumnOrder] = useState<ColumnOrderState>(() =>
    loadColumnOrder(columns)
  );
  const [dialogOpen, setDialogOpen] = useState(false);

  // Persist
  useEffect(() => {
    saveToStorage(VISIBILITY_KEY, columnVisibility);
  }, [columnVisibility]);

  useEffect(() => {
    saveToStorage(ORDER_KEY, columnOrder);
  }, [columnOrder]);

  const tableMeta: OrderHistoryTableMeta = {
    getCurrentPrice,
    getBtcPriceUsd,
    openFundingDialog,
  };

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnOrderChange: setColumnOrder,
    state: {
      sorting,
      columnVisibility,
      columnOrder,
    },
    meta: tableMeta,
  });

  const toggleColumn = useCallback((columnId: string) => {
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
    <div className="w-full overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-end px-3 py-1.5">
        <button
          type="button"
          onClick={() => setDialogOpen(true)}
          className="flex items-center gap-1.5 rounded px-2 py-1 text-[11px] font-medium text-primary-accent transition-colors hover:bg-theme/20 hover:text-primary"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Columns
        </button>
      </div>

      {/* Column config dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogTitle>Configure Columns</DialogTitle>
          <DialogDescription>
            Show or hide columns and drag to reorder.
          </DialogDescription>

          <div className="flex max-h-[60vh] flex-col gap-1 overflow-y-auto py-1">
            {columnOrder.map((colId, idx) => {
              const isMandatory = MANDATORY_COLUMNS.has(colId);
              const isVisible = columnVisibility[colId] !== false;
              const isFirst = idx === 0;
              const isLast = idx === columnOrder.length - 1;
              const label = getColumnLabel(colId, columns);

              return (
                <div
                  key={colId}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 transition-colors",
                    isVisible ? "bg-theme/10" : "opacity-50"
                  )}
                >
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={isVisible}
                    disabled={isMandatory}
                    onChange={() => toggleColumn(colId)}
                    className="border-border h-3.5 w-3.5 shrink-0 rounded accent-theme disabled:opacity-40"
                  />

                  {/* Label */}
                  <span className="min-w-0 flex-1 truncate text-sm">
                    {label}
                  </span>

                  {/* Reorder arrows */}
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

      {/* Table */}
      <div className="relative w-full overscroll-none px-3">
        <table cellSpacing={0} className="w-full table-auto overflow-auto">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr
                className="text-xs font-normal text-primary-accent"
                key={headerGroup.id}
              >
                {headerGroup.headers.map((header) => (
                  <th
                    className="sticky top-0 z-10 bg-background font-medium"
                    key={header.id}
                  >
                    <div className="block text-start">
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="w-full table-auto overflow-auto">
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <tr
                  className="text-xs transition-colors hover:bg-theme/20"
                  key={row.id}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      className={cn("whitespace-nowrap px-1 py-2")}
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
              <tr>
                <td colSpan={columns.length} className="h-24 text-center">
                  No results.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
