"use client";

import React, { useSyncExternalStore } from 'react';
import { OrderHistoryDataTable } from './data-table';
import { orderHistoryColumns } from './columns';
import { TradeOrder } from '@/lib/types';
import { usePriceFeed } from '@/lib/providers/feed';
import { useSessionStore } from '@/lib/providers/session';

interface OrderHistoryTableProps {
  data: TradeOrder[];
}

const OrderHistoryTable = React.memo(function OrderHistoryTable({ data }: OrderHistoryTableProps) {
  const storedBtcPrice = useSessionStore((state) => state.price.btcPrice);
  const { getCurrentPrice, subscribe } = usePriceFeed()
  const currentPrice = useSyncExternalStore(subscribe, getCurrentPrice, () => 0);
  const getBtcPriceUsd = () => currentPrice || storedBtcPrice;

  return (
    <OrderHistoryDataTable
      columns={orderHistoryColumns}
      data={data}
      getCurrentPrice={getCurrentPrice}
      getBtcPriceUsd={getBtcPriceUsd}
    />
  );
});

export default OrderHistoryTable;
