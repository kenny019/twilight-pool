"use client";
import React, { useEffect, useState } from "react";

import BTC from "@/lib/twilight/denoms";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import Big from "big.js";
import dayjs from "dayjs";
import cn from "@/lib/cn";
import { RecentTrade, getRecentLimitOrders } from "@/lib/api/rest";
import { useInterval } from "@/lib/hooks/useInterval";

export const orderbookColumns: ColumnDef<RecentTrade>[] = [
  {
    accessorKey: "price",
    header: "Price (USD)",
    cell: (col) => {
      return parseFloat(col.getValue() as string).toFixed(2);
    },
  },
  {
    accessorKey: "positionsize",
    header: "Size (BTC)",
    accessorFn: (row) => {
      return new BTC("sats", Big(row.positionsize)).convert("BTC").toFixed(4);
    },
  },
  {
    accessorKey: "timestamp",
    header: "Time",
    accessorFn: (row) => {
      return dayjs(row.timestamp).format("HH:mm:ss");
    },
  },
];

interface DataTableProps {
  columns: ColumnDef<RecentTrade>[];
  data: RecentTrade[];
  header?: boolean;
}

function OrderRecentTradesTable({
  columns,
  data,
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
                className="cursor-pointer text-xs hover:bg-theme/20 data-[state=selected]:bg-theme"
                key={row.id}
                data-state={row.getIsSelected() && "selected"}
              >
                {row.getVisibleCells().map((cell, index) => (
                  <td
                    className={cn(
                      "w-1/3",
                      index === 0
                        ? `text-start text-${
                            cell.row.original.side === "SHORT"
                              ? "red"
                              : "green-medium"
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
            <tr>
              <td colSpan={columns.length} className="h-24 text-center"></td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function OrderRecentTrades() {
  const [recentTradeData, setRecentTradeData] = useState<RecentTrade[]>([]);

  async function getRecentTradeData() {
    const result = await getRecentLimitOrders();

    if (!result.success) {
      console.error(result.error);
      return;
    }

    const sorted = result.data.result.sort(
      (left, right) =>
        dayjs(left.timestamp).unix() - dayjs(right.timestamp).unix()
    );
    setRecentTradeData(sorted);
  }

  useEffect(() => {
    getRecentTradeData();
  }, []);

  useInterval(() => {
    getRecentTradeData();
  }, 1000);

  return (
    <OrderRecentTradesTable
      columns={orderbookColumns}
      data={recentTradeData}
      header
    />
  );
}

export default OrderRecentTrades;
