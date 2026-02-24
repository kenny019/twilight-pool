"use client";

import { Text } from "@/components/typography";
import { LendOrder } from "@/lib/types";
import { ColumnDef } from "@tanstack/react-table";
import dayjs from "dayjs";
import Big from "big.js";
import BTC from "@/lib/twilight/denoms";
import cn from "@/lib/cn";
import Button from '@/components/button';
import Link from 'next/link';
import { truncateHash } from '@/lib/helpers';

export interface LendHistoryTableMeta {
  getCurrentPrice: () => number;
}

const orderStatus = {
  "LENDED": "Deposit",
  "SETTLED": "Withdraw"
}

export const lendHistoryColumns: ColumnDef<LendOrder & { accountTag: string }, any>[] = [
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
    accessorKey: "orderStatus2",
    header: "Type",
    cell: (row) => {
      const order = row.row.original;
      const status = orderStatus[order.orderStatus as keyof typeof orderStatus];

      return (
        <Text className="font-medium">{status}</Text>
      );
    },
  },
  {
    accessorKey: "value",
    header: "Amount (BTC)",
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
    header: "Entry Share NAV",
    cell: (row) => {
      const deposit = row.row.original.value;
      const npoolshare = row.row.original.npoolshare;

      if (!deposit || !npoolshare) {
        return <Text className="font-medium">0.00000000</Text>;
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
    accessorKey: "payment",
    header: "Profit/Loss (BTC)",
    cell: (row) => {
      const order = row.row.original;

      if (!order.payment) {
        return (
          <Text className="font-medium">
            -
          </Text>
        )
      }

      const rewards = new BTC("sats", Big(order.payment)).convert("BTC");
      return (
        <Text className="font-medium">
          {BTC.format(rewards, "BTC")}
        </Text>
      );
    },
  },
  {
    accessorKey: "tx_hash",
    header: "Transaction Hash",
    cell: (row) => (
      <Button className="justify-start" asChild variant="link">
        <Link
          href={`${process.env.NEXT_PUBLIC_EXPLORER_URL as string}/txs/${row.getValue()}`}
          target="_blank"
        >
          {truncateHash(row.getValue() as string)}
        </Link>
      </Button>
    ),
  },
  {
    accessorKey: "orderStatus",
    header: "Status",
    cell: (row) => {
      const order = row.row.original;
      const getStatusColor = (status: string) => {
        switch (status) {
          case "ERROR":
            return "bg-red/10 text-red";
          default:
            return "bg-green-medium/10 text-green-medium";
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
]; 