"use client";

import React, { useCallback, useState, useSyncExternalStore } from "react";
import { OrderHistoryDataTable } from "./data-table";
import { orderHistoryColumns } from "./columns";
import { TradeOrder } from "@/lib/types";
import { usePriceFeed } from "@/lib/providers/feed";
import { useSessionStore } from "@/lib/providers/session";
import FundingHistoryDialog from "@/components/funding-history-dialog";
import { OrderHistoryGroup } from "./grouped-order-history";

interface OrderHistoryTableProps {
  data: OrderHistoryGroup[];
}

const OrderHistoryTable = React.memo(function OrderHistoryTable({
  data,
}: OrderHistoryTableProps) {
  const storedBtcPrice = useSessionStore((state) => state.price.btcPrice);
  const { getCurrentPrice, subscribe } = usePriceFeed();
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
      <OrderHistoryDataTable
        columns={orderHistoryColumns}
        data={data}
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

export default OrderHistoryTable;
