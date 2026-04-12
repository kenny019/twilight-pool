"use client";

import { TableEmptyRow } from "@/components/empty-state";
import { Text } from "@/components/typography";
import cn from "@/lib/cn";
import useWithdrawRequests from "@/lib/hooks/useWithdrawRequests";
import { useTwilightStore } from "@/lib/providers/store";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Loader2 } from "lucide-react";
import { useMemo } from "react";
import { withdrawRequestColumns, MergedWithdrawRequest } from "./columns";

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
            <TableEmptyRow colSpan={columns.length} title="No withdrawal requests yet." />
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
  const storeWithdrawals = useTwilightStore(
    (state) => state.withdraw.withdrawals
  );

  const mergedData = useMemo((): MergedWithdrawRequest[] => {
    if (!data) return [];
    const unmatched = [...storeWithdrawals];
    return data.map((row) => {
      const amount = parseInt(row.withdrawAmount);
      const idx = unmatched.findIndex(
        (sw) =>
          sw.amount === amount &&
          (sw.withdrawAddress === undefined ||
            sw.withdrawAddress === row.withdrawAddress) &&
          (sw.reserveId === undefined ||
            sw.reserveId === parseInt(row.withdrawReserveId))
      );
      if (idx === -1) return row;
      const match = unmatched.splice(idx, 1)[0];
      return { ...row, tx_hash: match.tx_hash, status: match.status };
    });
  }, [data, storeWithdrawals]);

  return (
    <div className="rounded-lg border bg-background p-6">
      <Text heading="h3" className="mb-4 font-medium">
        Your Withdrawal Requests
      </Text>
      {isLoading ? (
        <div className="flex h-24 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-theme" />
        </div>
      ) : error ? (
        <div className="text-sm text-red">Failed to load withdrawal requests</div>
      ) : (
        <DataTable columns={withdrawRequestColumns} data={mergedData} />
      )}
    </div>
  );
}
