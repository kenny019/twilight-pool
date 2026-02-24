"use client";

import React, { useSyncExternalStore } from 'react';
import { TraderHistoryDataTable } from './data-table';
import { traderHistoryColumns } from './columns';
import { TradeOrder } from '@/lib/types';
import { usePriceFeed } from '@/lib/providers/feed';
import { useSessionStore } from '@/lib/providers/session';

interface TraderHistoryTableProps {
  data: TradeOrder[];
}

const TraderHistoryTable = React.memo(function TraderHistoryTable({ data }: TraderHistoryTableProps) {
  const storedBtcPrice = useSessionStore((state) => state.price.btcPrice);
  const { getCurrentPrice, subscribe } = usePriceFeed()
  const currentPrice = useSyncExternalStore(subscribe, getCurrentPrice, () => 0);
  const getBtcPriceUsd = () => currentPrice || storedBtcPrice;

  return (
    <TraderHistoryDataTable
      columns={traderHistoryColumns}
      data={data}
      getCurrentPrice={getCurrentPrice}
      getBtcPriceUsd={getBtcPriceUsd}
    />
  );
});

export default TraderHistoryTable;
