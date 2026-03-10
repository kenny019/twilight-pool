"use client";

import React from 'react';
import { TradeOrder } from '@/lib/types';
import { OpenOrderRow } from '../../details.client';
import { openOrdersColumns } from './columns';
import { OpenOrdersDataTable } from './data-table';

interface OpenOrdersTableProps {
  data: OpenOrderRow[];
  cancelOrder: (
    order: TradeOrder,
    options?: { sl_bool?: boolean; tp_bool?: boolean }
  ) => Promise<void>;
  openEditDialog: (order: TradeOrder) => void;
  isCancellingOrder: (uuid: string) => boolean;
}

const OpenOrdersTable = React.memo(function OpenOrdersTable({
  data,
  cancelOrder,
  openEditDialog,
  isCancellingOrder,
}: OpenOrdersTableProps) {
  return (
    <OpenOrdersDataTable
      columns={openOrdersColumns}
      data={data}
      cancelOrder={cancelOrder}
      openEditDialog={openEditDialog}
      isCancellingOrder={isCancellingOrder}
    />
  );
});

export default OpenOrdersTable;
