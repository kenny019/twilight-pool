import { useTwilightStore } from "@/lib/providers/store";
import React, { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "./dialog";
import { NumberInput } from "./input";
import Button from "./button";
import { useToast } from "@/lib/hooks/useToast";
import { settleOrder } from "@/lib/zk/trade";
import { useSessionStore } from "@/lib/providers/session";
import { usePriceFeed } from "@/lib/providers/feed";
import Link from "next/link";
import Big from "big.js";
import dayjs from "dayjs";
import { useQueryClient } from "@tanstack/react-query";
import cn from "@/lib/cn";
import BTC from "@/lib/twilight/denoms";
import { calculateUpnl } from "@/app/_components/trade/orderbook/my-trades/columns";
import { formatPnlWithUsd } from "@/lib/utils/formatPnl";
import { formatCurrency } from "@/lib/twilight/ticker";

type Props = {
  account?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function SettleLimitDialog({ account, open, onOpenChange }: Props) {
  const { toast } = useToast();

  const trades = useTwilightStore((state) => state.trade.trades);
  const updateTrade = useTwilightStore((state) => state.trade.updateTrade);
  const addTradeHistory = useTwilightStore(
    (state) => state.trade_history.addTrade
  );
  const privateKey = useSessionStore((state) => state.privateKey);
  const storedBtcPrice = useSessionStore((state) => state.price.btcPrice);

  const { getCurrentPrice } = usePriceFeed();
  const liveBtcPrice = getCurrentPrice();
  const currentPrice = liveBtcPrice || storedBtcPrice;

  const [limitPrice, setLimitPrice] = useState(currentPrice || 0);

  React.useEffect(() => {
    if (open && currentPrice) {
      setLimitPrice(currentPrice);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const selectedTrade = trades.find(
    (trade) => trade.accountAddress === account
  );

  const queryClient = useQueryClient();

  const entryPrice = selectedTrade?.entryPrice || 0;
  const markPrice = currentPrice || entryPrice;
  const positionSize = selectedTrade?.positionSize || 0;
  const positionType = selectedTrade?.positionType || "";

  const positionSizeBtc = BTC.format(
    new BTC("sats", Big(positionSize)).convert("BTC"),
    "BTC"
  );

  const estimatedPnl = calculateUpnl(
    entryPrice,
    limitPrice,
    positionType,
    positionSize
  );
  const estimatedPnlBtc = BTC.format(
    new BTC("sats", Big(estimatedPnl)).convert("BTC"),
    "BTC"
  );
  const estimatedPnlUsd = formatPnlWithUsd(estimatedPnl, currentPrice);
  const isPnlPositive = estimatedPnl > 0;
  const isPnlNegative = estimatedPnl < 0;

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
      description:
        "Please do not close this page while your position is being closed...",
    });

    console.log("limitPrice", limitPrice);
    const result = await settleOrder(
      selectedTrade,
      "limit",
      privateKey,
      limitPrice
    );

    if (!result.success) {
      toast({
        title: "Error settling order",
        description: result.message,
        variant: "error",
      });
      return;
    }

    const settledData = result.data;

    const updatedTradeData = {
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
      settleLimit: settledData.settle_limit,
      fundingApplied: settledData.funding_applied,
    };

    updateTrade(updatedTradeData);
    addTradeHistory({
      ...updatedTradeData,
      positionType:
        settledData.settle_limit?.position_type ||
        updatedTradeData.positionType,
      entryPrice: settledData.settle_limit
        ? Number(settledData.settle_limit.price)
        : updatedTradeData.entryPrice,
      orderStatus: "PENDING",
      orderType: "LIMIT",
      date: new Date(),
    });

    await queryClient.invalidateQueries({ queryKey: ["sync-trades"] });

    toast({
      title: "Limit order sent",
      description: (
        <div className="opacity-90">
          Close position limit order sent.{" "}
          {settledData.tx_hash && (
            <Link
              href={`${process.env.NEXT_PUBLIC_EXPLORER_URL as string}/txs/${settledData.tx_hash}`}
              target={"_blank"}
              className="text-sm underline hover:opacity-100"
            >
              Explorer link
            </Link>
          )}
        </div>
      ),
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>Close Position</DialogTitle>
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-primary-accent">
              Entry Price (USD)
            </span>
            <span className="text-sm font-medium">
              {formatCurrency(entryPrice)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-primary-accent">
              Mark Price (USD)
            </span>
            <span className="text-sm font-medium">
              {formatCurrency(markPrice)}
            </span>
          </div>

          <div className="border-t" />

          <div className="space-y-1">
            <label
              className="text-xs text-primary-accent"
              htmlFor="input-limit-amount-usd"
            >
              Limit Price (USD)
            </label>
            <NumberInput
              id="input-limit-amount-usd"
              inputValue={limitPrice}
              setInputValue={setLimitPrice}
              currentPrice={currentPrice}
              placeholder="0.00"
            />
          </div>

          <div className="border-t" />

          <div className="flex items-center justify-between">
            <span className="text-xs text-primary-accent">Position Amount</span>
            <span className="text-sm font-medium">{positionSizeBtc} BTC</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-primary-accent">Estimated PnL</span>
            <span
              className={cn(
                "text-sm font-medium",
                isPnlPositive && "text-green-medium",
                isPnlNegative && "text-red",
                !isPnlPositive && !isPnlNegative && "text-gray-500"
              )}
            >
              {isPnlPositive ? "+" : ""}
              {estimatedPnlBtc} BTC ({estimatedPnlUsd})
            </span>
          </div>

          <div className="border-t" />

          <Button onClick={handleSettleLimit}>Confirm</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default SettleLimitDialog;
