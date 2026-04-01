"use client";

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
    <div ref={scrollContainerRef} className="px-3 w-full overscroll-none relative">
      <table cellSpacing={0} className="w-full overflow-auto table-auto">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr
              className="text-xs font-normal text-primary-accent"
              key={headerGroup.id}
            >
              {headerGroup.headers.map((header, index) => {
                return (
                  <th
                    className={"px-2 py-2 font-medium text-start sticky z-10 top-0 bg-background border-b border-outline/10"}
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
        <tbody className="w-full overflow-auto table-auto">
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <tr
                className="text-xs transition-colors hover:bg-theme/20"
                key={row.id}
              >
                {row.getVisibleCells().map((cell, index) => (
                  <td
                    className={cn("px-2 py-2 whitespace-nowrap")}
                    key={cell.id}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={columns.length} className="h-24 px-2 text-center text-xs text-primary-accent">
                No results.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
