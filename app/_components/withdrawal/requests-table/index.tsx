"use client";

import { Text } from "@/components/typography";
import cn from "@/lib/cn";
import useWithdrawRequests from "@/lib/hooks/useWithdrawRequests";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Loader2 } from "lucide-react";
import { withdrawRequestColumns } from "./columns";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
}

function DataTable<TData, TValue>({
  columns,
  data,
}: DataTableProps<TData, TValue>) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div
      className="w-full overflow-auto"
      style={{ scrollbarWidth: "none", maxHeight: "300px" }}
    >
      <table cellSpacing={0} className="w-full table-auto">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr
              className="text-xs font-normal text-primary-accent"
              key={headerGroup.id}
            >
              {headerGroup.headers.map((header) => (
                <th
                  className="sticky top-0 z-10 bg-background font-medium"
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
        <tbody>
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <tr
                className="text-xs transition-colors hover:bg-theme/20"
                key={row.id}
              >
                {row.getVisibleCells().map((cell) => (
                  <td
                    className={cn("whitespace-nowrap px-1 py-2")}
                    key={cell.id}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td
                colSpan={columns.length}
                className="h-24 text-center text-primary-accent"
              >
                No withdrawal requests yet
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

interface WithdrawRequestsTableProps {
  twilightAddress?: string;
}

export default function WithdrawRequestsTable({
  twilightAddress,
}: WithdrawRequestsTableProps) {
  const { data, isLoading, error } = useWithdrawRequests(twilightAddress);

  return (
    <div className="rounded-lg border bg-background p-6">
      <Text heading="h3" className="mb-4 font-medium">
        Your Withdrawals
      </Text>
      {isLoading ? (
        <div className="flex h-24 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-theme" />
        </div>
      ) : error ? (
        <div className="text-sm text-red">Failed to load withdrawal requests</div>
      ) : (
        <DataTable columns={withdrawRequestColumns} data={data ?? []} />
      )}
    </div>
  );
}
