"use client";

import BTC from "@/lib/twilight/denoms";
import { DisplayLimitOrderData } from "@/lib/types";
import { ColumnDef } from "@tanstack/react-table";
import Big from "big.js";

export type Order = {
  price: number;
  size: number;
  total: number;
};

export const orderbookColumns: ColumnDef<DisplayLimitOrderData>[] = [
  {
    accessorKey: "price",
    header: "Price (USD)",
    cell: (col) => {
      return (col.getValue() as number).toFixed(2);
    },
  },
  {
    accessorKey: "size",
    header: "Size (BTC)",
    accessorFn: (row) => {
      return new BTC("sats", Big(row.size)).convert("BTC").toFixed(5);
    },
  },
];
