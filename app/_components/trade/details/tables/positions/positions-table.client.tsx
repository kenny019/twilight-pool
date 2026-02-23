"use client";

import React, { useSyncExternalStore } from 'react';
import { PositionsDataTable } from './data-table';
import { positionsColumns } from './columns';
import { TradeOrder } from '@/lib/types';
import { useLimitDialog } from '@/lib/providers/limit-dialogs';
import { usePriceFeed } from '@/lib/providers/feed';
import { useSessionStore } from '@/lib/providers/session';

interface PositionsTableProps {
  data: TradeOrder[];
  settleMarketOrder: (trade: TradeOrder, currentPrice: number) => Promise<void>;
  isSettlingOrder: (uuid: string) => boolean;
}

const PositionsTable = React.memo(function PositionsTable({ data, settleMarketOrder, isSettlingOrder }: PositionsTableProps) {
  const { openLimitDialog } = useLimitDialog();
  const storedBtcPrice = useSessionStore((state) => state.price.btcPrice);

  const { getCurrentPrice, subscribe } = usePriceFeed()
  // Subscribe to price updates so mark price / UPNL columns refresh
  const currentPrice = useSyncExternalStore(subscribe, getCurrentPrice, () => 0);
  const getBtcPriceUsd = () => currentPrice || storedBtcPrice;

  return (
    <PositionsDataTable
      columns={positionsColumns}
      data={data}
      getCurrentPrice={getCurrentPrice}
      getBtcPriceUsd={getBtcPriceUsd}
      settleMarketOrder={settleMarketOrder}
      isSettlingOrder={isSettlingOrder}
      openLimitDialog={openLimitDialog}
    />

  );
});

export default PositionsTable;
