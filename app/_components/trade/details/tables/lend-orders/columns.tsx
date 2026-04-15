"use client";

import Button from "@/components/button";
import { Text } from "@/components/typography";
import { LendOrder } from "@/lib/types";
import { ColumnDef } from "@tanstack/react-table";
import dayjs from "dayjs";
import Big from "big.js";
import BTC from "@/lib/twilight/denoms";
import { Loader2 } from "lucide-react";
import cn from "@/lib/cn";
import { calculateAPR, formatSatsCompact } from "@/lib/helpers";
import { Tooltip } from "@/components/tooltip";
import { PoolSharesCell } from "@/components/pool-shares-cell";
import { POOL_SHARE_DECIMALS_SCALE } from "@/lib/format/poolShares";

const MIN_HOLDING_SECONDS = 3600; // 1 hour - don't annualize before this

export interface LendOrdersTableMeta {
  getCurrentPrice: () => number;
  getPoolSharePrice: () => number;
  settleLendOrder: (order: LendOrder) => Promise<void>;
  settlingOrderId: string | null;
  isRelayerHalted?: boolean;
}

export const lendOrdersColumns: ColumnDef<
  LendOrder & { accountTag: string },
  any
>[] = [
  {
    accessorKey: "timestamp",
    header: "Date",
    accessorFn: (row) => dayjs(row.timestamp).valueOf(), // keep for sorting
    cell: (row) => (
      <span className="tabular-nums">
        {dayjs(row.row.original.timestamp).format("DD/MM/YYYY HH:mm:ss")}
      </span>
    ),
  },
  {
    accessorKey: "accountTag",
    header: "Account Tag",
    cell: (row) => {
      const order = row.row.original;
      // Only show if user has multiple accounts
      return <Text className="text-xs">{order.accountTag}</Text>;
    },
  },
  {
    accessorKey: "value",
    header: "Size (BTC)",
    cell: (row) => {
      const order = row.row.original;
      const amountBTC = new BTC("sats", Big(order.value)).convert("BTC");
      return (
        <Text className="font-medium">{BTC.format(amountBTC, "BTC")}</Text>
      );
    },
  },
  {
    accessorKey: "npoolshare",
    header: "Shares",
    cell: (row) => {
      const order = row.row.original;

      if (!order.npoolshare) {
        return <Text className="font-medium">-</Text>;
      }

      return (
        <Text className="font-medium">
          <PoolSharesCell npoolshare={order.npoolshare} />
        </Text>
      );
    },
  },
  {
    accessorKey: "pool_share_price",
    header: () => (
      <Tooltip
        title="Entry Share NAV"
        body="Implied Share NAV at the time of deposit"
      >
        <span>NAV</span>
      </Tooltip>
    ),
    cell: (row) => {
      const deposit = row.row.original.value;
      const npoolshare = row.row.original.npoolshare;

      if (!deposit || !npoolshare) {
        return <Text className="font-medium">—</Text>;
      }

      const entryShareNavSats = Math.round(
        Big(deposit).mul(POOL_SHARE_DECIMALS_SCALE).div(npoolshare).toNumber()
      );

      return (
        <Text className="font-medium">
          {entryShareNavSats.toLocaleString()} sats
        </Text>
      );
    },
  },
  {
    accessorKey: "apy",
    header: "Ann. Ret.",
    cell: (row) => {
      const order = row.row.original;
      const meta = row.table.options.meta as LendOrdersTableMeta;

      if (!order.npoolshare || !order.value) {
        return <Text className="font-medium">0.00%</Text>;
      }

      const currentSharePrice = meta.getPoolSharePrice();
      const orderTimestampMs = dayjs(order.timestamp).valueOf();

      const rewards =
        currentSharePrice * (order.npoolshare / POOL_SHARE_DECIMALS_SCALE) -
        order.value;
      const timeElapsedSeconds = (Date.now() - orderTimestampMs) / 1000;

      const apr =
        timeElapsedSeconds >= MIN_HOLDING_SECONDS
          ? calculateAPR({
              rewards,
              principal: order.value,
              timeElapsedSeconds,
            })
          : 0;

      const showApr =
        timeElapsedSeconds >= MIN_HOLDING_SECONDS && Number.isFinite(apr);

      return (
        <Text
          className={cn(
            "font-medium",
            apr > 0 && "text-green-medium",
            apr < 0 && "text-red"
          )}
        >
          {showApr ? `${apr.toFixed(2)}%` : "—"}
        </Text>
      );
    },
  },
  {
    accessorKey: "accrued_rewards",
    header: "PnL",
    cell: (row) => {
      const order = row.row.original;
      const meta = row.table.options.meta as LendOrdersTableMeta;

      if (!order.npoolshare || !order.value) {
        return <Text className="font-medium">0.00000000 BTC</Text>;
      }
      // no of shares * pool value - deposit_value

      const currentSharePrice = meta.getPoolSharePrice();
      const shareQty = order.npoolshare;

      const accruedRewards =
        currentSharePrice * (shareQty / POOL_SHARE_DECIMALS_SCALE) -
        order.value;

      // Suppress small positive dust only. Always show negative values.
      if (accruedRewards >= 0 && accruedRewards < 100) {
        return <Text className="font-medium text-primary/50">0</Text>;
      }

      return (
        <Text
          className={cn(
            "font-medium",
            accruedRewards > 0 ? "text-green-medium" : "text-red"
          )}
        >
          {formatSatsCompact(Math.round(accruedRewards))}
        </Text>
      );
    },
  },
  {
    accessorKey: "orderStatus",
    header: "Status",
    cell: (row) => {
      const order = row.row.original;
      const getStatusColor = (status: string) => {
        switch (status) {
          case "WITHDRAWING":
            return "bg-primary/10 text-primary";
          case "LENDED":
            return "bg-green-medium/10 text-green-medium/80";
          case "ERROR":
            return "bg-red/10 text-red";
          default:
            return "bg-primary/10 text-primary";
        }
      };

      const statusLabel = order.withdrawPending
        ? "WITHDRAWING"
        : order.orderStatus;
      const statusDisplayLabel =
        statusLabel === "LENDED"
          ? "ACTIVE"
          : statusLabel === "SETTLED"
            ? "CLOSED"
            : statusLabel;

      return (
        <span
          className={cn(
            "rounded px-2 py-1 text-xs font-medium",
            getStatusColor(statusLabel)
          )}
        >
          {statusDisplayLabel}
        </span>
      );
    },
  },
  {
    id: "action",
    header: "Action",
    cell: (row) => {
      const order = row.row.original;
      const meta = row.table.options.meta as LendOrdersTableMeta;
      const isSettling = meta.settlingOrderId === order.accountAddress;

      if (order.orderStatus !== "LENDED") {
        return null;
      }

      const withdrawDisabled =
        isSettling ||
        !!order.withdrawPending ||
        meta.settlingOrderId !== null ||
        meta.isRelayerHalted;

      return (
        <div className="flex justify-start space-x-2">
          <span
            title={
              meta.isRelayerHalted
                ? "The relayer is halted. Withdrawals will be available when it resumes."
                : undefined
            }
          >
            <Button
              variant="ui"
              size="small"
              onClick={() => meta.settleLendOrder(order)}
              disabled={withdrawDisabled}
              className="border-theme/60 bg-theme/[0.08] px-3 py-1.5 text-theme hover:border-theme hover:bg-theme/[0.12]"
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
        </div>
      );
    },
  },
];
