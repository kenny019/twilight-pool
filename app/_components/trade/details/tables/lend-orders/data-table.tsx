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
import { useState } from "react";
import { LendOrdersTableMeta } from "./columns";
import { LendOrder } from "@/lib/types";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  getCurrentPrice: () => number;
  getPoolSharePrice: () => number;
  settleLendOrder: (order: LendOrder) => Promise<void>;
  settlingOrderId: string | null;
  isRelayerHalted?: boolean;
}

export function LendOrdersDataTable<TData, TValue>({
  columns,
  data,
  getCurrentPrice,
  getPoolSharePrice,
  settleLendOrder,
  settlingOrderId,
  isRelayerHalted,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "timestamp", desc: true },
  ]);

  // Define the table meta data
  const tableMeta: LendOrdersTableMeta = {
    getCurrentPrice,
    getPoolSharePrice,
    settleLendOrder,
    settlingOrderId,
    isRelayerHalted,
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
    meta: tableMeta,
  });

  return (
    <div className="w-full overflow-x-auto">
      <table
        cellSpacing={0}
        className="relative min-w-[880px] w-full"
      >
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr
              className="text-xs font-normal text-primary-accent"
              key={headerGroup.id}
            >
              {headerGroup.headers.map((header, index) => {
                return (
                  <th
                    className={cn("px-2 py-2 text-start font-medium")}
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
              <td colSpan={columns.length} className="h-24 px-2 text-center">
                No active lend orders.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
} 