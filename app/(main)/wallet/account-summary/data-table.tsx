"use client";

import { ToastProps } from '@/components/toast';
import cn from "@/lib/cn";
import { useToast } from '@/lib/hooks/useToast';
import {
  ColumnDef,
  SortingState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useCallback, useState } from "react";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
}

export interface AccountSummaryTableMeta {
  toast: (options: any) => void;
  subaccountTransfer: (address: string) => Promise<void>;
  isTransferring: (address: string) => boolean;
}

interface AccountSummaryDataTableProps<TData, TValue> extends DataTableProps<TData, TValue> {
  subaccountTransfer: (address: string) => Promise<any>;
}

export function AccountSummaryDataTable<TData, TValue>({
  columns,
  data,
  subaccountTransfer,
}: AccountSummaryDataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "createdAt", desc: true },
  ]);
  const [transferringAddress, setTransferringAddress] = useState<string | null>(null);

  const { toast } = useToast()

  const wrappedTransfer = useCallback(async (address: string) => {
    setTransferringAddress(address);
    try {
      await subaccountTransfer(address);
    } finally {
      setTransferringAddress(null);
    }
  }, [subaccountTransfer]);

  const tableMeta: AccountSummaryTableMeta = {
    toast,
    subaccountTransfer: wrappedTransfer,
    isTransferring: (address: string) => transferringAddress === address,
  };

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    initialState: {
      sorting,
    },
    getSortedRowModel: getSortedRowModel(),
    meta: tableMeta,
  });

  return (
    <div className="w-full">
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
                className="text-xs hover:bg-theme/20 data-[state=selected]:bg-theme"
                key={row.id}
                data-state={row.getIsSelected() && "selected"}
              >
                {row.getVisibleCells().map((cell, index) => (
                  <td
                    className={cn("px-1 py-2 whitespace-nowrap",
                      index === row.getVisibleCells().length - 1
                        ? "text-end"
                        : "text-start"
                    )}

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
  );
}
