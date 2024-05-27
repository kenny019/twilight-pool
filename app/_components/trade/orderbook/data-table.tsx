"use client";

import cn from "@/lib/cn";
import { DisplayLimitOrderData, LimitChange } from "@/lib/types";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";

interface DataTableProps {
  columns: ColumnDef<DisplayLimitOrderData, any>[];
  data: DisplayLimitOrderData[];
  type: "asks" | "bids";
  header?: boolean;
}

const ChangeBackgroundColor = {
  [LimitChange.EQUAL]: "bg-transparent",
  [LimitChange.INCREASE]: "bg-green-medium/20",
  [LimitChange.DECREASE]: "bg-red/30",
};

export function OrderBookDataTable<TData, TValue>({
  columns,
  data,
  type,
  header = false,
}: DataTableProps) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="w-full px-3">
      <table cellSpacing={0} className="relative w-full overflow-auto">
        <thead className={cn(!header && "hidden")}>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr
              className="text-xs font-normal text-primary-accent"
              key={headerGroup.id}
            >
              {headerGroup.headers.map((header, index) => {
                return (
                  <th
                    className={cn(index === 0 ? "text-start" : "text-end")}
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
                className={cn(
                  "cursor-pointer text-xs hover:bg-theme/20 data-[state=selected]:bg-theme",
                  ChangeBackgroundColor[row.original.change]
                )}
                key={row.id}
                data-state={row.getIsSelected() && "selected"}
              >
                {row.getVisibleCells().map((cell, index) => (
                  <td
                    className={cn(
                      "w-1/3",
                      index === 0
                        ? `text-start text-${
                            type === "asks" ? "red" : "green-medium"
                          }`
                        : "text-end"
                    )}
                    key={cell.id}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <></>
          )}
        </tbody>
      </table>
    </div>
  );
}
