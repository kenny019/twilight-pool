"use client";

import React, { useCallback, useState, useSyncExternalStore } from 'react';
import { TraderHistoryDataTable } from './data-table';
import { traderHistoryColumns } from './columns';
import { TradeOrder } from '@/lib/types';
import { usePriceFeed } from '@/lib/providers/feed';
import { useSessionStore } from '@/lib/providers/session';
import FundingHistoryDialog from '@/components/funding-history-dialog';

interface TraderHistoryTableProps {
  data: TradeOrder[];
}

const TraderHistoryTable = React.memo(function TraderHistoryTable({ data }: TraderHistoryTableProps) {
  const storedBtcPrice = useSessionStore((state) => state.price.btcPrice);
  const { getCurrentPrice, subscribe } = usePriceFeed()
  const currentPrice = useSyncExternalStore(subscribe, getCurrentPrice, () => 0);
  const getBtcPriceUsd = () => currentPrice || storedBtcPrice;

  const [fundingDialogTrade, setFundingDialogTrade] = useState<TradeOrder | null>(null);
  const [isFundingDialogOpen, setIsFundingDialogOpen] = useState(false);

  const openFundingDialog = useCallback((trade: TradeOrder) => {
    setFundingDialogTrade(trade);
    setIsFundingDialogOpen(true);
  }, []);

  return (
    <>
      <TraderHistoryDataTable
        columns={traderHistoryColumns}
        data={data}
        getCurrentPrice={getCurrentPrice}
        getBtcPriceUsd={getBtcPriceUsd}
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

export default TraderHistoryTable;
