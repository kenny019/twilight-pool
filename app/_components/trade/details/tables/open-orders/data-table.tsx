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
import { TradeOrder } from "@/lib/types";
import { OpenOrdersTableMeta } from './columns';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  cancelOrder: (order: TradeOrder, options?: { sl_bool?: boolean; tp_bool?: boolean }) => Promise<void>;
  openEditDialog: (order: TradeOrder) => void;
  openConditionalDialog: (account: string, mode: "limit" | "sltp") => void;
  isCancellingOrder: (uuid: string) => boolean;
}

export function OpenOrdersDataTable<TData, TValue>({
  columns,
  data,
  cancelOrder,
  openEditDialog,
  openConditionalDialog,
  isCancellingOrder,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "date", desc: true },
  ]);

  // Define the table meta data
  const tableMeta: OpenOrdersTableMeta = {
    cancelOrder,
    openEditDialog,
    openConditionalDialog,
    isCancellingOrder,
  };

  const table = useReactTable({
    data: data,
    columns,
    // Synthetic SL/TP rows share the same `uuid` as the parent trade, so we
    // append the leg suffix to produce a stable unique row key.
    getRowId: (row: any) =>
      row._sltpLeg ? `${row.uuid}_${row._sltpLeg}` : (row.uuid as string),
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
    <div className="px-3 w-full overscroll-none relative">
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
            <TableEmptyRow colSpan={columns.length} title="No open orders." />
          )}
        </tbody>
      </table>
    </div>
  );
}
