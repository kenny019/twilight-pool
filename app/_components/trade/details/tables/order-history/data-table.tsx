"use client";

import { TableEmptyRow } from "@/components/empty-state";
import cn from "@/lib/cn";
import { truncateHash, formatSatsMBtc } from "@/lib/helpers";
import Link from "next/link";
import dayjs from "dayjs";
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
import {
  Fragment,
  type ReactNode,
  useCallback,
  useEffect,
  useState,
} from "react";
import {
  OrderHistoryTableMeta,
  MANDATORY_COLUMNS,
  DEFAULT_HIDDEN_COLUMNS,
} from "./columns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/dialog";
import { Info, ChevronUp, ChevronDown } from "lucide-react";
import { PnlCell } from "@/lib/components/pnl-display";
import {
  getOrderHistoryFee,
  getOrderHistoryFunding,
  getOrderHistoryPnl,
  getTimelineEventTitle,
  OrderHistoryGroup,
  PRICE_KIND_LABELS,
} from "./grouped-order-history";
import { TradeOrder } from "@/lib/types";
import { toast } from "@/lib/hooks/useToast";

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

function getTimelineBadgeClasses(): string {
  return "border border-theme/25 bg-theme/10 text-theme";
}

function copyValue(value: string, label: string) {
  navigator.clipboard.writeText(value);
  toast({
    title: "Copied to clipboard",
    description: `${label} copied to clipboard`,
  });
}

function MetadataItem({
  label,
  value,
  className,
  labelClassName,
  valueClassName,
}: {
  label: string;
  value: ReactNode;
  className?: string;
  labelClassName?: string;
  valueClassName?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-0.5", className)}>
      <span
        className={cn(
          "text-[10px] uppercase tracking-wide text-primary/40",
          labelClassName
        )}
      >
        {label}
      </span>
      <div className={cn("text-primary/85 text-[11px]", valueClassName)}>
        {value}
      </div>
    </div>
  );
}

function TimelineRow({
  trade,
  btcPriceUsd,
  openFundingDialog,
  isLast,
}: {
  trade: TradeOrder;
  btcPriceUsd: number;
  openFundingDialog: (trade: TradeOrder) => void;
  isLast: boolean;
}) {
  const eventTitle = getTimelineEventTitle(trade);
  const fee = getOrderHistoryFee(trade);
  const funding = getOrderHistoryFunding(trade);
  const pnl = getOrderHistoryPnl(trade);
  const showClose =
    trade.orderStatus === "SETTLED" || trade.orderStatus === "LIQUIDATE";
  const triggerPrice =
    trade.displayPrice != null && trade.priceKind && trade.priceKind !== "NONE"
      ? {
          label: PRICE_KIND_LABELS[trade.priceKind] ?? "Trigger",
          value: `$${trade.displayPrice.toFixed(2)}`,
        }
      : null;

  const hasDetails =
    showClose ||
    triggerPrice ||
    pnl != null ||
    fee != null ||
    funding != null ||
    trade.tx_hash ||
    trade.request_id ||
    trade.reason;
  const showMarginData = trade.orderStatus === "FILLED" || showClose;

  return (
    <div className="relative pl-4">
      {!isLast && (
        <div className="bg-border/50 absolute bottom-0 left-[4px] top-2.5 w-px" />
      )}
      <div className="bg-border/70 absolute left-0 top-2 h-2 w-2 rounded-full" />

      <div className="border-border/50 rounded-lg border bg-background/70 px-3 py-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <span
              className={cn(
                "rounded px-1.5 py-0.5 text-[10px] font-medium",
                getTimelineBadgeClasses()
              )}
            >
              {eventTitle}
            </span>
            <span className="text-[11px] font-medium text-primary/70">
              {trade.orderType}
            </span>
          </div>
          <span className="text-primary/55 text-[11px] tabular-nums">
            {dayjs(trade.date).format("DD MMM YYYY HH:mm:ss")}
          </span>
        </div>

        {hasDetails && (
          <div className="mt-1.5 grid grid-cols-2 gap-x-4 gap-y-1.5 lg:grid-cols-3 xl:grid-cols-4">
            {showClose && (
              <MetadataItem
                label="Close"
                value={
                  <span className="font-medium">
                    ${trade.settlementPrice.toFixed(2)}
                  </span>
                }
              />
            )}
            {triggerPrice && (
              <MetadataItem
                label={triggerPrice.label}
                value={
                  <span className="font-medium">{triggerPrice.value}</span>
                }
              />
            )}
            {pnl != null && (
              <MetadataItem
                label="PnL"
                value={
                  <PnlCell
                    pnlSats={pnl}
                    btcPriceUsd={btcPriceUsd}
                    layout="inline"
                  />
                }
              />
            )}
            {fee != null && (
              <MetadataItem
                label="Fee"
                value={
                  <span className="font-medium">{formatSatsMBtc(fee)}</span>
                }
              />
            )}
            {funding != null && (
              <MetadataItem
                label="Funding"
                value={
                  <span className="inline-flex items-center gap-1.5 font-medium">
                    <span>{formatSatsMBtc(funding)}</span>
                    {(trade.orderStatus === "SETTLED" ||
                      trade.orderStatus === "LIQUIDATE") && (
                      <button
                        type="button"
                        onClick={() => openFundingDialog(trade)}
                        className="rounded p-0.5 text-primary/40 transition-colors hover:bg-primary/5 hover:text-primary/60"
                        aria-label="View funding history"
                      >
                        <Info className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </span>
                }
              />
            )}
            {showMarginData &&
              trade.executionPrice > 0 &&
              trade.executionPrice !== trade.entryPrice && (
                <MetadataItem
                  label="Exec Price"
                  value={
                    <span className="font-medium">
                      ${trade.executionPrice.toFixed(2)}
                    </span>
                  }
                />
              )}
            {showMarginData && trade.initialMargin > 0 && (
              <MetadataItem
                label="Init Margin"
                value={
                  <span className="font-medium">
                    {formatSatsMBtc(trade.initialMargin)}
                  </span>
                }
              />
            )}
            {showMarginData && trade.availableMargin > 0 && (
              <MetadataItem
                label="Avail Margin"
                value={
                  <span className="font-medium">
                    {formatSatsMBtc(trade.availableMargin)}
                  </span>
                }
              />
            )}
            {showMarginData && trade.maintenanceMargin > 0 && (
              <MetadataItem
                label="Maint. Margin"
                value={
                  <span className="font-medium">
                    {formatSatsMBtc(trade.maintenanceMargin)}
                  </span>
                }
              />
            )}
            {trade.tx_hash && (
              <MetadataItem
                label="Tx Hash"
                value={
                  <Link
                    href={`${process.env.NEXT_PUBLIC_EXPLORER_URL as string}/txs/${trade.tx_hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium hover:underline"
                  >
                    {truncateHash(trade.tx_hash)}
                  </Link>
                }
              />
            )}
            {trade.request_id && (
              <MetadataItem
                label="Request ID"
                value={
                  <button
                    type="button"
                    onClick={() => copyValue(trade.request_id!, "Request ID")}
                    className="font-medium hover:underline"
                  >
                    {truncateHash(trade.request_id, 4, 4)}
                  </button>
                }
              />
            )}
            {trade.reason && (
              <MetadataItem
                label="Reason"
                className="col-span-full"
                value={<span className="text-primary/70">{trade.reason}</span>}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

interface DataTableProps<TValue> {
  columns: ColumnDef<OrderHistoryGroup, TValue>[];
  data: OrderHistoryGroup[];
  getBtcPriceUsd: () => number;
  openFundingDialog: (trade: TradeOrder) => void;
  columnConfigOpen?: boolean;
  onColumnConfigOpenChange?: (open: boolean) => void;
}

export function OrderHistoryDataTable<TValue>({
  columns,
  data,
  getBtcPriceUsd,
  openFundingDialog,
  columnConfigOpen,
  onColumnConfigOpenChange,
}: DataTableProps<TValue>) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "latestDate", desc: true },
  ]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(
    () => loadColumnVisibility(columns)
  );
  const [columnOrder, setColumnOrder] = useState<ColumnOrderState>(() =>
    loadColumnOrder(columns)
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const effectiveDialogOpen = columnConfigOpen ?? dialogOpen;
  const setEffectiveDialogOpen = onColumnConfigOpenChange ?? setDialogOpen;
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    saveToStorage(VISIBILITY_KEY, columnVisibility);
  }, [columnVisibility]);

  useEffect(() => {
    saveToStorage(ORDER_KEY, columnOrder);
  }, [columnOrder]);

  const toggleExpand = useCallback((uuid: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(uuid)) {
        next.delete(uuid);
      } else {
        next.add(uuid);
      }
      return next;
    });
  }, []);

  const tableMeta: OrderHistoryTableMeta = {
    getBtcPriceUsd,
    isExpanded: (uuid) => expandedIds.has(uuid),
    toggleExpand,
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
      <Dialog open={effectiveDialogOpen} onOpenChange={setEffectiveDialogOpen}>
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
                  <input
                    type="checkbox"
                    checked={isVisible}
                    disabled={isMandatory}
                    onChange={() => toggleColumn(colId)}
                    className="border-border h-3.5 w-3.5 shrink-0 rounded accent-theme disabled:opacity-40"
                  />

                  <span className="min-w-0 flex-1 truncate text-sm">
                    {label}
                  </span>

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

      <div className="w-full overflow-x-auto overscroll-none px-3">
        <table cellSpacing={0} className="min-w-max table-auto">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr
                className="text-xs font-normal text-primary-accent"
                key={headerGroup.id}
              >
                {headerGroup.headers.map((header) => (
                  <th
                    className="border-outline/10 sticky top-0 z-10 border-b bg-background px-2 py-2 text-start font-medium"
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
          <tbody className="w-full table-auto">
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => {
                const group = row.original;
                const isExpanded = expandedIds.has(group.uuid);
                const visibleCellCount = row.getVisibleCells().length;

                return (
                  <Fragment key={row.id}>
                    <tr className="text-xs transition-colors hover:bg-theme/20">
                      {row.getVisibleCells().map((cell) => (
                        <td
                          className="whitespace-nowrap px-2 py-2"
                          key={cell.id}
                        >
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </td>
                      ))}
                    </tr>

                    {isExpanded && (
                      <tr key={`${row.id}-expanded`}>
                        <td
                          colSpan={visibleCellCount}
                          className="px-2 pb-3 pt-0"
                        >
                          <div className="border-border/50 rounded-b-xl border border-t-0 bg-primary/[0.02] px-3.5 py-2.5">
                            <div className="mb-3 flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] uppercase tracking-wide text-primary/40">
                                  Order ID
                                </span>
                                <button
                                  type="button"
                                  className="text-[11px] font-medium hover:underline"
                                  onClick={() =>
                                    copyValue(group.uuid, "Order ID")
                                  }
                                >
                                  {truncateHash(group.uuid, 4, 4)}
                                </button>
                              </div>
                              <span className="text-primary/55 text-[11px]">
                                {group.rows.length} event
                                {group.rows.length === 1 ? "" : "s"}
                              </span>
                            </div>

                            <div className="space-y-2.5">
                              {group.rows.map((trade, index) => (
                                <TimelineRow
                                  key={
                                    trade.idempotency_key ??
                                    `${trade.uuid}_${trade.orderStatus}_${trade.date.toString()}`
                                  }
                                  trade={trade}
                                  btcPriceUsd={getBtcPriceUsd()}
                                  openFundingDialog={openFundingDialog}
                                  isLast={index === group.rows.length - 1}
                                />
                              ))}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })
            ) : (
              <TableEmptyRow
                colSpan={columns.length}
                title="No order history."
              />
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
