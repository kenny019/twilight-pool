"use client";

import { EmptyState, TableEmptyRow } from "@/components/empty-state";
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
import { LendHistoryTableMeta } from "./columns";
import { LendOrder } from "@/lib/types";
import BTC from "@/lib/twilight/denoms";
import Big from "big.js";
import dayjs from "dayjs";
import Link from "next/link";
import { truncateHash } from "@/lib/helpers";
import { PoolSharesCell } from "@/components/pool-shares-cell";
import { POOL_SHARE_DECIMALS_SCALE } from "@/lib/format/poolShares";
import { PnlCell } from "@/lib/components/pnl-display";

type LendOrderWithAccountTag = LendOrder & { accountTag: string };

const orderStatusLabel: Record<string, string> = {
  LENDED: "Deposit",
  SETTLED: "Withdraw",
};

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  getCurrentPrice: () => number;
}

export function LendHistoryDataTable<TData, TValue>({
  columns,
  data,
  getCurrentPrice,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "timestamp", desc: true },
  ]);

  const tableMeta: LendHistoryTableMeta = {
    getCurrentPrice,
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
    <div className="w-full">
      {/* Desktop table — hidden on mobile */}
      <div className="hidden overflow-x-auto md:block">
        <table cellSpacing={0} className="relative w-full min-w-[720px]">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr
                className="border-outline/10 border-b text-xs font-normal text-primary-accent"
                key={headerGroup.id}
              >
                {headerGroup.headers.map((header) => {
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
                  {row.getVisibleCells().map((cell) => (
                    <td
                      className={cn("whitespace-nowrap px-2 py-2 text-start")}
                      key={cell.id}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <TableEmptyRow
                colSpan={columns.length}
                title="No lend history."
              />
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile cards — hidden on desktop */}
      <div className="space-y-2.5 px-1 py-2 md:hidden">
        {table.getRowModel().rows?.length ? (
          table.getRowModel().rows.map((row) => {
            const order = row.original as LendOrderWithAccountTag;
            const rowId = `${order.accountAddress}-${order.timestamp}`;

            const isDeposit = order.orderStatus === "LENDED";
            const isCancelled = order.orderStatus === "CANCELLED";
            const typeLabel =
              orderStatusLabel[order.orderStatus] ?? order.orderStatus;

            const amountBTC = new BTC("sats", Big(order.value)).convert("BTC");
            const amountLabel = `${BTC.format(amountBTC, "BTC")} BTC`;

            const dateStr = dayjs(order.timestamp).format("DD/MM/YY HH:mm");

            const btcPriceUsd = getCurrentPrice();

            // Badge: Deposit = green, Withdraw = muted neutral, Cancelled = muted red
            const badgeCls = isDeposit
              ? "bg-green-medium/10 text-green-medium/80"
              : isCancelled
                ? "bg-red/10 text-red/70"
                : "bg-primary/10 text-primary/60";

            // NAV: implied share price at deposit
            let navLabel: string | null = null;
            if (order.value && order.npoolshare) {
              const navSats = Math.round(
                Big(order.value)
                  .mul(POOL_SHARE_DECIMALS_SCALE)
                  .div(order.npoolshare)
                  .toNumber()
              );
              navLabel = `${navSats.toLocaleString()} sats`;
            }

            return (
              <div
                key={rowId}
                className="border-border/70 rounded-xl border bg-background/90 shadow-sm"
              >
                <div className="px-3 py-2.5">
                  {/* Header: badge (left) + date (right) */}
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <span
                      className={cn(
                        "shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium",
                        badgeCls
                      )}
                    >
                      {typeLabel.toUpperCase()}
                    </span>
                    <span className="truncate text-[10px] text-primary/40">
                      {dateStr}
                    </span>
                  </div>

                  {/* Primary: Amount — dominant */}
                  <div className="mb-3">
                    <span className="block text-[10px] text-primary/40">
                      Amount
                    </span>
                    <span className="block truncate text-lg font-semibold tabular-nums leading-tight text-primary">
                      {amountLabel}
                    </span>
                  </div>

                  {/* Secondary 2×2 grid */}
                  <div className="mb-3 grid grid-cols-2 gap-x-3 gap-y-3">
                    {/* Reward / PnL */}
                    <div className="min-w-0">
                      <span className="block text-[10px] text-primary/40">
                        Reward
                      </span>
                      {order.payment != null ? (
                        <PnlCell
                          pnlSats={order.payment}
                          btcPriceUsd={btcPriceUsd}
                          layout="inline"
                        />
                      ) : (
                        <span className="block text-sm font-medium text-primary/40">
                          —
                        </span>
                      )}
                    </div>

                    {/* NAV */}
                    <div className="min-w-0">
                      <span className="block text-[10px] text-primary/40">
                        NAV
                      </span>
                      <span className="block truncate text-sm font-medium tabular-nums">
                        {navLabel ?? "—"}
                      </span>
                    </div>

                    {/* Shares */}
                    <div className="min-w-0">
                      <span className="block text-[10px] text-primary/40">
                        Shares
                      </span>
                      <span className="block truncate text-sm font-medium">
                        {order.npoolshare ? (
                          <PoolSharesCell npoolshare={order.npoolshare} />
                        ) : (
                          "—"
                        )}
                      </span>
                    </div>

                    {/* Account */}
                    {order.accountTag && (
                      <div className="min-w-0">
                        <span className="block text-[10px] text-primary/40">
                          Account
                        </span>
                        <span className="block truncate text-sm font-medium text-primary/60">
                          {order.accountTag}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Tx footer */}
                  {order.tx_hash && (
                    <div className="border-outline/[0.08] border-t pt-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] text-primary/40">Tx</span>
                        <Link
                          href={`${process.env.NEXT_PUBLIC_EXPLORER_URL as string}/txs/${order.tx_hash}`}
                          target="_blank"
                          className="text-[10px] text-primary/40 underline-offset-2 hover:text-primary/60 hover:underline"
                        >
                          {truncateHash(order.tx_hash)}
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <EmptyState title="No lend history." />
        )}
      </div>
    </div>
  );
}
