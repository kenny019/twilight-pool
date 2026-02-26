"use client";

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
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

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
      <div style={{ minHeight: `${pagination.pageSize * 34 + 20}px` }}>
      <table cellSpacing={0} className="relative w-full overflow-auto">
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
                      "px-1 font-medium",
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
                {row.getVisibleCells().map((cell, index) => (
                  <td
                    className={cn("px-1 py-2 whitespace-nowrap")}
                    key={cell.id}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={columns.length} className="h-24 text-center"></td>
            </tr>
          )}
        </tbody>
      </table>
      </div>
      {table.getPageCount() > 1 && (
        <div className="flex items-center justify-between pt-3 text-xs text-primary-accent">
          <span className="font-ui">
            {table.getFilteredRowModel().rows.length} transactions
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
