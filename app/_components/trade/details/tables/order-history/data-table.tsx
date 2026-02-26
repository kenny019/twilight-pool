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
import { useEffect, useState } from "react";
import { OrderHistoryTableMeta } from "./columns";
import { useToast } from '@/lib/hooks/useToast';

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

  // Define the table meta data
  const tableMeta: OrderHistoryTableMeta = {
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

  const [maxHeight, setMaxHeight] = useState<number>(0);

  useEffect(() => {
    const detailsElement = document.querySelector("#details");
    if (!detailsElement) return;

    const updateHeight = () => {
      setMaxHeight(detailsElement.clientHeight - 69);
    };

    // Initial height calculation
    updateHeight();

    // Use ResizeObserver to watch for changes to the details element
    const resizeObserver = new ResizeObserver(() => {
      updateHeight();
    });

    resizeObserver.observe(detailsElement);

    // Also listen to window resize for responsive layout changes
    window.addEventListener('resize', updateHeight);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateHeight);
    };
  }, []);

  return (
    <div className="px-3 w-full overflow-auto overscroll-none relative" style={{ scrollbarWidth: "none", maxHeight: `${maxHeight}px` }}>
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
                    className={"font-medium sticky z-10 top-0 bg-background"}
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
              <td colSpan={columns.length} className="h-24 text-center">
                No results.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
