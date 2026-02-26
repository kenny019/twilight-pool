"use client";

import React from "react";
import { LendOrdersDataTable } from "./data-table";
import { lendOrdersColumns } from "./columns";
import { LendOrder } from "@/lib/types";

type LendOrderWithAccountTag = LendOrder & { accountTag: string };

interface Props {
  data: LendOrderWithAccountTag[];
  getCurrentPrice: () => number;
  getPoolSharePrice: () => number;
  settleLendOrder: (order: LendOrder) => Promise<void>;
  settlingOrderId: string | null;
  isRelayerHalted?: boolean;
}

const LendOrdersTable = ({
  data,
  getCurrentPrice,
  getPoolSharePrice,
  settleLendOrder,
  settlingOrderId,
  isRelayerHalted,
}: Props) => {
  return (
    <LendOrdersDataTable
      columns={lendOrdersColumns}
      data={data}
      getCurrentPrice={getCurrentPrice}
      getPoolSharePrice={getPoolSharePrice}
      settleLendOrder={settleLendOrder}
      settlingOrderId={settlingOrderId}
      isRelayerHalted={isRelayerHalted}
    />
  );
};

export default LendOrdersTable; 