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

export interface LendOrdersTableMeta {
  getCurrentPrice: () => number;
  getPoolSharePrice: () => number;
  settleLendOrder: (order: LendOrder) => Promise<void>;
  settlingOrderId: string | null;
}

export const lendOrdersColumns: ColumnDef<LendOrder & { accountTag: string }, any>[] = [
  {
    accessorKey: "timestamp",
    header: "Date",
    accessorFn: (row) => dayjs(row.timestamp).format("DD/MM/YYYY HH:mm:ss"),
  },
  {
    accessorKey: "accountTag",
    header: "Account Tag",
    cell: (row) => {
      const order = row.row.original;
      // Only show if user has multiple accounts
      return (
        <Text className="text-xs">
          {order.accountTag}
        </Text>
      );
    },
  },
  {
    accessorKey: "value",
    header: "Deposit (BTC)",
    cell: (row) => {
      const order = row.row.original;
      const amountBTC = new BTC("sats", Big(order.value)).convert("BTC");
      return (
        <Text className="font-medium">
          {BTC.format(amountBTC, "BTC")}
        </Text>
      );
    },
  },
  {
    accessorKey: "npoolshare",
    header: "No of Shares",
    cell: (row) => {
      const order = row.row.original;

      if (!order.npoolshare) {
        return (
          <Text className="font-medium">
            -
          </Text>
        )
      }

      const shares = order.npoolshare / 10_000;

      return (
        <Text className="font-medium">
          {shares.toLocaleString() || "0"} shares
        </Text>
      );
    },
  },
  {
    accessorKey: "pool_share_price",
    header: "Entry Pool Share Value (BTC)",
    cell: (row) => {
      const deposit = row.row.original.value;
      const npoolshare = row.row.original.npoolshare;

      if (!deposit || !npoolshare) {
        return <Text className="font-medium">0.00000000 BTC</Text>;
      }

      const shareValue = Big(deposit).div(npoolshare).div(10_000)

      return (
        <Text className="font-medium">
          {shareValue.toFixed(8)}
        </Text>
      );
    },
  },
  {
    accessorKey: "apy",
    header: "APR %",
    cell: (row) => {
      const order = row.row.original;
      return (
        <Text className="font-medium">
          {order.apy?.toFixed(2) || "0.00"}%
        </Text>
      );
    },
  },
  {
    accessorKey: "accrued_rewards",
    header: "U.Rewards (BTC)",
    cell: (row) => {
      const order = row.row.original;
      const meta = row.table.options.meta as LendOrdersTableMeta;

      if (!order.npoolshare || !order.value) {
        return <Text className="font-medium">0.00000000 BTC</Text>;
      }
      // no of shares * pool value - deposit_value

      const currentSharePrice = meta.getPoolSharePrice();
      const shareQty = order.npoolshare;

      const accruedRewards = ((currentSharePrice * (shareQty / 10000)) - order.value)
      const rewardsBTC = new BTC("sats", Big(accruedRewards)).convert("BTC");

      return (
        <Text className="font-medium">
          {BTC.format(rewardsBTC, "BTC")}
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
          case "LENDED":
            return "bg-green-medium/10 text-green-medium";
          case "ERROR":
            return "bg-red/10 text-red";
          default:
            return "bg-primary/10 text-primary";
        }
      };

      return (
        <span
          className={cn(
            "px-2 py-1 rounded text-xs font-medium",
            getStatusColor(order.orderStatus)
          )}
        >
          {order.orderStatus}
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

      return (

        <div className="flex space-x-2 justify-start">
          <Button
            size="small"
            onClick={() => meta.settleLendOrder(order)}
            disabled={isSettling || meta.settlingOrderId !== null}
            className="px-3 py-1"
          >
            {isSettling ? (
              <>
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                Withdrawing...
              </>
            ) : (
              "Withdraw"
            )}
          </Button>
        </div>
      );
    },
  },
]; 