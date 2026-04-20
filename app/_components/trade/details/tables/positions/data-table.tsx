"use client";

import { TableEmptyRow } from "@/components/empty-state";
import cn from "@/lib/cn";
import {
  ColumnDef,
  SortingState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useEffect, useState, useRef } from "react";
import { PositionsTableMeta } from "./columns";
import { TradeOrder } from "@/lib/types";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  getCurrentPrice: () => number;
  getBtcPriceUsd: () => number;
  openLimitDialog: (account: string) => void;
  openConditionalDialog: (account: string, mode: "limit" | "sltp") => void;
  openFundingDialog: (trade: TradeOrder) => void;
  settleMarketOrder: (trade: TradeOrder, currentPrice: number) => Promise<void>;
  isSettlingOrder: (uuid: string) => boolean;
  cancelOrder: (
    order: TradeOrder,
    options?: { sl_bool?: boolean; tp_bool?: boolean }
  ) => Promise<void>;
  isCancellingOrder: (uuid: string) => boolean;
}

export function PositionsDataTable<TData, TValue>({
  columns,
  data,
  getCurrentPrice,
  getBtcPriceUsd,
  openLimitDialog,
  openConditionalDialog,
  openFundingDialog,
  settleMarketOrder,
  isSettlingOrder,
  cancelOrder,
  isCancellingOrder,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "date", desc: true },
  ]);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Define the table meta data
  const tableMeta: PositionsTableMeta = {
    getCurrentPrice,
    getBtcPriceUsd,
    openLimitDialog,
    openConditionalDialog,
    openFundingDialog,
    settleMarketOrder,
    isSettlingOrder,
    cancelOrder,
    isCancellingOrder,
  };

  const table = useReactTable({
    data: data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    initialState: {
      sorting: sorting,
    },
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: {
      sorting,
    },
    meta: tableMeta, // Pass the meta data to the table
  });

  // Preserve scroll position when data updates
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const scrollTop = container.scrollTop;

    // Restore scroll position after render
    requestAnimationFrame(() => {
      container.scrollTop = scrollTop;
    });
  }, [data]);

  return (
    <div
      ref={scrollContainerRef}
      className="relative w-full overflow-x-auto overscroll-none px-3"
    >
      <table cellSpacing={0} className="min-w-max table-auto">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr
              className="text-xs font-normal text-primary-accent"
              key={headerGroup.id}
            >
              {headerGroup.headers.map((header, index) => {
                return (
                  <th
                    className={
                      "border-outline/10 sticky top-0 z-10 border-b bg-background px-2 py-2 text-start font-medium"
                    }
                    key={header.id}
                  >
                    <div className="block">
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </div>
                  </th>
                );
              })}
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
                {row.getVisibleCells().map((cell, index) => (
                  <td
                    className={cn("whitespace-nowrap px-2 py-2")}
                    key={cell.id}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <TableEmptyRow
              colSpan={columns.length}
              title="No open positions."
            />
          )}
        </tbody>
      </table>
    </div>
  );
}
