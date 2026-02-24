"use client";

import React from 'react';
import { TradeOrder } from '@/lib/types';
import { openOrdersColumns } from './columns';
import { OpenOrdersDataTable } from './data-table';

interface OpenOrdersTableProps {
  data: TradeOrder[];
  cancelOrder: (order: TradeOrder) => Promise<void>;
  openEditDialog: (order: TradeOrder) => void;
}

const OpenOrdersTable = React.memo(function OpenOrdersTable({ data, cancelOrder, openEditDialog }: OpenOrdersTableProps) {
  return (
    <OpenOrdersDataTable
      columns={openOrdersColumns}
      data={data}
      cancelOrder={cancelOrder}
      openEditDialog={openEditDialog}
    />

  );
});

export default OpenOrdersTable;
