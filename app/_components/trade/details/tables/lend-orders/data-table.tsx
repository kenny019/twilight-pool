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
import { LendOrdersTableMeta } from "./columns";
import { LendOrder } from "@/lib/types";
import { Loader2 } from "lucide-react";
import BTC from "@/lib/twilight/denoms";
import Big from "big.js";
import dayjs from "dayjs";
import { calculateAPR } from "@/lib/helpers";
import { PnlCell } from "@/lib/components/pnl-display";
import { PoolSharesCell } from "@/components/pool-shares-cell";
import { POOL_SHARE_DECIMALS_SCALE } from "@/lib/format/poolShares";
import Button from "@/components/button";

type LendOrderWithAccountTag = LendOrder & { accountTag: string };
const MIN_HOLDING_SECONDS = 3600;

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  getCurrentPrice: () => number;
  getPoolSharePrice: () => number;
  settleLendOrder: (order: LendOrder) => Promise<void>;
  settlingOrderId: string | null;
  isRelayerHalted?: boolean;
}

export function LendOrdersDataTable<TData, TValue>({
  columns,
  data,
  getCurrentPrice,
  getPoolSharePrice,
  settleLendOrder,
  settlingOrderId,
  isRelayerHalted,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "timestamp", desc: true },
  ]);

  const tableMeta: LendOrdersTableMeta = {
    getCurrentPrice,
    getPoolSharePrice,
    settleLendOrder,
    settlingOrderId,
    isRelayerHalted,
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
        <table cellSpacing={0} className="relative w-full min-w-[880px]">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr
                className="border-outline/20 border-b text-xs font-normal text-primary-accent"
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
                      className={cn("whitespace-nowrap px-2 py-2")}
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
                title="No active lend orders."
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
            const cardId = order.accountAddress;
            const isSettling = settlingOrderId === order.accountAddress;

            // Deposit
            const amountBTC = new BTC("sats", Big(order.value)).convert("BTC");
            const depositLabel = BTC.format(amountBTC, "BTC");

            // Date
            const dateStr = dayjs(order.timestamp).format("DD/MM/YY HH:mm");

            // Status
            const statusLabel = order.withdrawPending
              ? "WITHDRAWING"
              : order.orderStatus;
            const statusDisplayLabel =
              statusLabel === "LENDED"
                ? "ACTIVE"
                : statusLabel === "SETTLED"
                  ? "CLOSED"
                  : statusLabel;
            const statusCls =
              statusLabel === "LENDED"
                ? "bg-primary/10 text-primary/50"
                : statusLabel === "WITHDRAWING"
                  ? "bg-primary/10 text-primary"
                  : "bg-red/10 text-red";

            // PnL + APR
            const btcPriceUsd = getCurrentPrice();
            let pnlSats: number | null = null;
            let apr: number | null = null;
            let showApr = false;

            if (order.npoolshare && order.value) {
              const currentSharePrice = getPoolSharePrice();
              const accruedRewards =
                currentSharePrice *
                  (order.npoolshare / POOL_SHARE_DECIMALS_SCALE) -
                order.value;
              pnlSats = accruedRewards < 100 ? 0 : Math.round(accruedRewards);

              const timeElapsedSeconds =
                (Date.now() - dayjs(order.timestamp).valueOf()) / 1000;
              if (timeElapsedSeconds >= MIN_HOLDING_SECONDS) {
                const computed = calculateAPR({
                  rewards: accruedRewards,
                  principal: order.value,
                  timeElapsedSeconds,
                });
                if (Number.isFinite(computed)) {
                  apr = computed;
                  showApr = true;
                }
              }
            }

            // NAV (entry share price implied at deposit)
            let navLabel = "—";
            if (order.value && order.npoolshare) {
              const navSats = Math.round(
                Big(order.value)
                  .mul(POOL_SHARE_DECIMALS_SCALE)
                  .div(order.npoolshare)
                  .toNumber()
              );
              navLabel = `${navSats.toLocaleString()} sats`;
            }

            // Withdraw button
            const withdrawDisabled =
              isSettling ||
              !!order.withdrawPending ||
              settlingOrderId !== null ||
              !!isRelayerHalted;

            return (
              <div
                key={cardId}
                className="border-border/70 hover:border-border rounded-xl border bg-background/90 shadow-sm transition-all duration-150 hover:-translate-y-[1px] hover:shadow-md"
              >
                <div className="px-3 py-2.5">
                  {/* Header: Status (left) + Date (right) */}
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <span
                      className={cn(
                        "shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium",
                        statusCls
                      )}
                    >
                      {statusDisplayLabel}
                    </span>
                    <span className="truncate text-[10px] text-primary/40">
                      {dateStr}
                    </span>
                  </div>

                  {/* Primary: Size (BTC) — dominant, full width */}
                  <div className="mb-3">
                    <span className="block text-[10px] text-primary/40">
                      Size
                    </span>
                    <span className="block truncate text-lg font-semibold tabular-nums leading-tight text-primary">
                      {depositLabel} BTC
                    </span>
                  </div>

                  {/* Secondary + Supporting: 2×2 grid */}
                  <div className="mb-3 grid grid-cols-2 gap-x-3 gap-y-3">
                    {/* PnL */}
                    <div className="min-w-0">
                      <span className="block text-[10px] text-primary/40">
                        PnL
                      </span>
                      <PnlCell
                        pnlSats={pnlSats}
                        btcPriceUsd={btcPriceUsd}
                        layout="inline"
                      />
                    </div>
                    {/* Ann. Return */}
                    <div className="min-w-0">
                      <span className="block text-[10px] text-primary/40">
                        Ann. Return
                      </span>
                      <span
                        className={cn(
                          "block truncate text-sm font-medium",
                          apr !== null && apr > 0
                            ? "text-green-medium"
                            : apr !== null && apr < 0
                              ? "text-red"
                              : "text-primary/70"
                        )}
                      >
                        {showApr && apr !== null ? `${apr.toFixed(2)}%` : "—"}
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
                    {/* NAV */}
                    <div className="min-w-0">
                      <span className="block text-[10px] text-primary/40">
                        NAV
                      </span>
                      <span className="block truncate text-sm font-medium tabular-nums">
                        {navLabel}
                      </span>
                    </div>
                  </div>

                  {/* Account tag */}
                  {order.accountTag && (
                    <div className="mb-3">
                      <span className="text-[10px] text-primary/40">
                        Account{" "}
                      </span>
                      <span className="truncate text-[10px] text-primary/60">
                        {order.accountTag}
                      </span>
                    </div>
                  )}

                  {/* Withdraw CTA */}
                  {order.orderStatus === "LENDED" && (
                    <span
                      title={
                        isRelayerHalted
                          ? "The relayer is halted. Withdrawals will be available when it resumes."
                          : undefined
                      }
                      className="block"
                    >
                      <Button
                        variant="ui"
                        size="small"
                        className="min-h-[44px] w-full justify-center border-theme/70 text-primary transition-colors hover:border-theme max-md:h-12 max-md:bg-theme/10 max-md:text-base max-md:font-semibold max-md:text-theme max-md:active:bg-theme/20"
                        disabled={withdrawDisabled}
                        onClick={() => settleLendOrder(order)}
                      >
                        {isSettling ? (
                          <>
                            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                            Withdrawing...
                          </>
                        ) : order.withdrawPending ? (
                          "Withdrawing..."
                        ) : (
                          "Withdraw"
                        )}
                      </Button>
                    </span>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <EmptyState title="No active lend orders." />
        )}
      </div>
    </div>
  );
}
