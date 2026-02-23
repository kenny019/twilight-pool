"use client";

import React, { useSyncExternalStore } from 'react';
import { PositionsDataTable } from './data-table';
import { positionsColumns } from './columns';
import { TradeOrder } from '@/lib/types';
import { useLimitDialog } from '@/lib/providers/limit-dialogs';
import { usePriceFeed } from '@/lib/providers/feed';

interface PositionsTableProps {
  data: TradeOrder[];
  settleMarketOrder: (trade: TradeOrder, currentPrice: number) => Promise<void>;
  isSettlingOrder: (uuid: string) => boolean;
}

const PositionsTable = React.memo(function PositionsTable({ data, settleMarketOrder, isSettlingOrder }: PositionsTableProps) {
  const { openLimitDialog } = useLimitDialog();

  const { getCurrentPrice, subscribe } = usePriceFeed()
  // Subscribe to price updates so mark price / UPNL columns refresh
  useSyncExternalStore(subscribe, getCurrentPrice, () => 0);

  return (
    <PositionsDataTable
      columns={positionsColumns}
      data={data}
      getCurrentPrice={getCurrentPrice}
      settleMarketOrder={settleMarketOrder}
      isSettlingOrder={isSettlingOrder}
      openLimitDialog={openLimitDialog}
    />

  );
});

export default PositionsTable;
