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
import { useState } from "react";
import { TraderHistoryTableMeta } from "./columns";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  getCurrentPrice: () => number;
  getBtcPriceUsd: () => number;
  openFundingDialog: (trade: import("@/lib/types").TradeOrder) => void;
}

export function TraderHistoryDataTable<TData, TValue>({
  columns,
  data,
  getCurrentPrice,
  getBtcPriceUsd,
  openFundingDialog,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "date", desc: true },
  ]);

  // Define the table meta data
  const tableMeta: TraderHistoryTableMeta = {
    getCurrentPrice,
    getBtcPriceUsd,
    openFundingDialog,
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

  return (
    <div className="relative w-full overflow-x-auto overscroll-none px-3">
      <table cellSpacing={0} className="w-full min-w-max table-auto">
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
        <tbody>
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
            <TableEmptyRow colSpan={columns.length} title="No trade history." />
          )}
        </tbody>
      </table>
    </div>
  );
}
