"use client";

import { ColumnDef } from "@tanstack/react-table";

export type Order = {
  price: number;
  size: number;
  total: number;
};

export const orderAsks: Order[] = [
  // {
  //   price: 37206,
  //   size: 1,
  //   total: 37206,
  // },
  // {
  //   price: 37185,
  //   size: 0.30105,
  //   total: 11194,
  // },
  // {
  //   price: 37170,
  //   size: 8.37,
  //   total: 311112.9,
  // },
  // {
  //   price: 37191,
  //   size: 0.18,
  //   total: 6694.38,
  // },
  // {
  //   price: 37201,
  //   size: 11.37,
  //   total: 422975.37,
  // },
];

export const orderbookColumns: ColumnDef<Order>[] = [
  {
    accessorKey: "price",
    header: "Price (USD)",
  },
  {
    accessorKey: "size",
    header: "Size (BTC)",
  },
  {
    accessorKey: "total",
    header: "Total",
  },
];
