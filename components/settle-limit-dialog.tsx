import { useTwilightStore } from '@/lib/providers/store';
import React, { useState } from 'react'
import { Dialog, DialogContent, DialogTitle } from './dialog';
import { NumberInput } from './input';
import Button from './button';
import { useToast } from '@/lib/hooks/useToast';
import { settleOrder } from '@/lib/zk/trade';
import { useSessionStore } from '@/lib/providers/session';
import { usePriceFeed } from '@/lib/providers/feed';
import Link from 'next/link';
import Big from 'big.js';
import dayjs from 'dayjs';
import { useQueryClient } from '@tanstack/react-query';

type Props = {
  account?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function SettleLimitDialog({ account, open, onOpenChange }: Props) {
  const { toast } = useToast();

  const trades = useTwilightStore((state) => state.trade.trades);
  const updateTrade = useTwilightStore((state) => state.trade.updateTrade)
  const privateKey = useSessionStore((state) => state.privateKey);
  const storedBtcPrice = useSessionStore((state) => state.price.btcPrice);

  const { getCurrentPrice } = usePriceFeed();
  const liveBtcPrice = getCurrentPrice();
  const currentPrice = liveBtcPrice || storedBtcPrice;

  const [limitPrice, setLimitPrice] = useState(currentPrice || 0);

  const selectedTrade = trades.find((trade) => trade.accountAddress === account);

  const queryClient = useQueryClient();

  async function handleSettleLimit() {
    if (limitPrice < 0) {
      toast({
        title: "Invalid limit price",
        description: "Please enter a valid limit price",
        variant: "error",
      });
      return;
    }

    if (!selectedTrade) {
      toast({
        title: "Invalid trade",
        description: "Please select a valid trade",
        variant: "error",
      });
      return;
    }

    onOpenChange(false);

    toast({
      title: "Closing position",
      description: "Please do not close this page while your position is being closed...",
    })

    console.log("limitPrice", limitPrice)
    const result = await settleOrder(selectedTrade, "limit", privateKey, limitPrice)

    if (!result.success) {
      toast({
        title: "Error settling order",
        description: result.message,
        variant: "error",
      })
      return;
    }

    const settledData = result.data;

    updateTrade({
      ...selectedTrade,
      orderStatus: settledData.order_status,
      availableMargin: Big(settledData.available_margin).toNumber(),
      maintenanceMargin: Big(settledData.maintenance_margin).toNumber(),
      unrealizedPnl: Big(settledData.unrealized_pnl).toNumber(),
      settlementPrice: Big(settledData.settlement_price).toNumber(),
      positionSize: Big(settledData.positionsize).toNumber(),
      orderType: settledData.order_type,
      date: dayjs(settledData.timestamp).toDate(),
      exit_nonce: settledData.exit_nonce,
      executionPrice: Big(settledData.execution_price).toNumber(),
      isOpen: false,
      feeSettled: Big(settledData.fee_settled).toNumber(),
      feeFilled: Big(settledData.fee_filled).toNumber(),
      realizedPnl: Big(settledData.unrealized_pnl).toNumber(),
      tx_hash: settledData.tx_hash || selectedTrade.tx_hash,
      liquidationPrice: Big(settledData.liquidation_price).toNumber(),
      bankruptcyPrice: Big(settledData.bankruptcy_price).toNumber(),
      bankruptcyValue: Big(settledData.bankruptcy_value).toNumber(),
      initialMargin: Big(settledData.initial_margin).toNumber(),
    })

    await queryClient.invalidateQueries({ queryKey: ['sync-trades'] })

    toast({
      title: "Limit order sent",
      description: <div className="opacity-90">
        Close position limit order sent.{" "}
        {
          settledData.tx_hash && (
            <Link
              href={`${process.env.NEXT_PUBLIC_EXPLORER_URL as string}/txs/${settledData.tx_hash}`}
              target={"_blank"}
              className="text-sm underline hover:opacity-100"
            >
              Explorer link
            </Link>
          )
        }
      </div>
    })

  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>Settle Limit</DialogTitle>
        <div className="flex flex-col gap-6">
          <div className="space-y-1">
            <label className="text-sm font-medium text-primary-accent" htmlFor="input-limit-amount-usd">Limit Price (USD)</label>
            <NumberInput
              id="input-limit-amount-usd"
              inputValue={limitPrice}
              setInputValue={setLimitPrice}
              currentPrice={currentPrice}
              placeholder="0.00"
            />
          </div>

          <Button onClick={handleSettleLimit}>Settle Limit</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default SettleLimitDialog
