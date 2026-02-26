"use client";

import React, { useCallback, useState, useSyncExternalStore } from 'react';
import { PositionsDataTable } from './data-table';
import { positionsColumns } from './columns';
import { TradeOrder } from '@/lib/types';
import { useLimitDialog } from '@/lib/providers/limit-dialogs';
import { usePriceFeed } from '@/lib/providers/feed';
import { useSessionStore } from '@/lib/providers/session';
import FundingHistoryDialog from '@/components/funding-history-dialog';

interface PositionsTableProps {
  data: TradeOrder[];
  settleMarketOrder: (trade: TradeOrder, currentPrice: number) => Promise<void>;
  isSettlingOrder: (uuid: string) => boolean;
}

const PositionsTable = React.memo(function PositionsTable({ data, settleMarketOrder, isSettlingOrder }: PositionsTableProps) {
  const { openLimitDialog } = useLimitDialog();
  const storedBtcPrice = useSessionStore((state) => state.price.btcPrice);

  const [fundingDialogTrade, setFundingDialogTrade] = useState<TradeOrder | null>(null);
  const [isFundingDialogOpen, setIsFundingDialogOpen] = useState(false);

  const openFundingDialog = useCallback((trade: TradeOrder) => {
    setFundingDialogTrade(trade);
    setIsFundingDialogOpen(true);
  }, []);

  const { getCurrentPrice, subscribe } = usePriceFeed()
  // Subscribe to price updates so mark price / UPNL columns refresh
  const currentPrice = useSyncExternalStore(subscribe, getCurrentPrice, () => 0);
  const getBtcPriceUsd = () => currentPrice || storedBtcPrice;

  return (
    <>
      <PositionsDataTable
        columns={positionsColumns}
        data={data}
        getCurrentPrice={getCurrentPrice}
        getBtcPriceUsd={getBtcPriceUsd}
        settleMarketOrder={settleMarketOrder}
        isSettlingOrder={isSettlingOrder}
        openLimitDialog={openLimitDialog}
        openFundingDialog={openFundingDialog}
      />
      <FundingHistoryDialog
        trade={fundingDialogTrade}
        open={isFundingDialogOpen}
        onOpenChange={(open) => {
          setIsFundingDialogOpen(open);
          if (!open) setFundingDialogTrade(null);
        }}
      />
    </>
  );
});

export default PositionsTable;
