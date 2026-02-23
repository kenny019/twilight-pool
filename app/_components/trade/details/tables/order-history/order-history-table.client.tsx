"use client";

import React, { useSyncExternalStore } from 'react';
import { OrderHistoryDataTable } from './data-table';
import { orderHistoryColumns } from './columns';
import { TradeOrder } from '@/lib/types';
import { usePriceFeed } from '@/lib/providers/feed';

interface OrderHistoryTableProps {
  data: TradeOrder[];
}

const OrderHistoryTable = React.memo(function OrderHistoryTable({ data }: OrderHistoryTableProps) {
  const { getCurrentPrice, subscribe } = usePriceFeed()
  useSyncExternalStore(subscribe, getCurrentPrice, () => 0);

  return (
    <OrderHistoryDataTable
      columns={orderHistoryColumns}
      data={data}
      getCurrentPrice={getCurrentPrice}
    />
  );
});

export default OrderHistoryTable;
