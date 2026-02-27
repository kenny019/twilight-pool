"use client";

import { useTwilightStore } from "@/lib/providers/store";
import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "./dialog";
import { NumberInput } from "./input";
import Button from "./button";
import { useToast } from "@/lib/hooks/useToast";
import { settleOrder, settleOrderSltp } from "@/lib/zk/trade";
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
import { Tabs, TabsList, TabsTrigger } from "./tabs";
import * as TabsPrimitive from "@radix-ui/react-tabs";

type Props = {
  account?: string;
  initialTab?: "limit" | "sltp";
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function ConditionalCloseDialog({
  account,
  initialTab = "limit",
  open,
  onOpenChange,
}: Props) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"limit" | "sltp">(initialTab);

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
  const [slPrice, setSlPrice] = useState<number>(0);
  const [tpPrice, setTpPrice] = useState<number>(0);

  const selectedTrade = trades.find((trade) => trade.accountAddress === account);
  const queryClient = useQueryClient();

  const entryPrice = selectedTrade?.entryPrice || 0;
  const markPrice = currentPrice || entryPrice;
  const positionSize = selectedTrade?.positionSize || 0;
  const positionType = selectedTrade?.positionType || "";

  const positionSizeBtc = BTC.format(
    new BTC("sats", Big(positionSize)).convert("BTC"),
    "BTC"
  );

  const hasSettleLimit = !!selectedTrade?.settleLimit;
  const hasSltp = !!(
    selectedTrade?.takeProfit ||
    selectedTrade?.stopLoss
  );

  useEffect(() => {
    if (open) {
      setActiveTab(initialTab);
      if (currentPrice) {
        setLimitPrice(currentPrice);
        setSlPrice(currentPrice);
        setTpPrice(currentPrice);
      }
    }
  }, [open, initialTab, currentPrice]);

  const estimatedPnlLimit = calculateUpnl(
    entryPrice,
    limitPrice,
    positionType,
    positionSize
  );
  const estimatedPnlLimitBtc = BTC.format(
    new BTC("sats", Big(estimatedPnlLimit)).convert("BTC"),
    "BTC"
  );
  const estimatedPnlLimitUsd = formatPnlWithUsd(estimatedPnlLimit, currentPrice);
  const isPnlLimitPositive = estimatedPnlLimit > 0;
  const isPnlLimitNegative = estimatedPnlLimit < 0;

  const estimatedPnlSl = calculateUpnl(
    entryPrice,
    slPrice,
    positionType,
    positionSize
  );
  const estimatedPnlTp = calculateUpnl(
    entryPrice,
    tpPrice,
    positionType,
    positionSize
  );

  function validateSltp(): string | null {
    if (!selectedTrade) return "Please select a valid trade";
    const hasSl = slPrice > 0;
    const hasTp = tpPrice > 0;
    if (!hasSl && !hasTp) {
      return "At least one of Stop Loss or Take Profit is required";
    }
    if (hasSl && hasTp && Math.abs(slPrice - tpPrice) < 0.01) {
      return "Stop Loss and Take Profit cannot be the same";
    }
    const isLong = positionType.toUpperCase() === "LONG";
    if (hasSl) {
      if (isLong && slPrice >= entryPrice) {
        return "For LONG: Stop Loss must be below entry price";
      }
      if (!isLong && slPrice <= entryPrice) {
        return "For SHORT: Stop Loss must be above entry price";
      }
    }
    if (hasTp) {
      if (isLong && tpPrice <= entryPrice) {
        return "For LONG: Take Profit must be above entry price";
      }
      if (!isLong && tpPrice >= entryPrice) {
        return "For SHORT: Take Profit must be below entry price";
      }
    }
    return null;
  }

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
    if (hasSltp) {
      toast({
        title: "Cancel SLTP first",
        description: "You have SL/TP orders. Cancel them first to place a limit close.",
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
      settleLimit: settledData.settle_limit
        ? {
            ...settledData.settle_limit,
            timestamp: settledData.settle_limit.timestamp,
          }
        : null,
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

  async function handleSettleSltp() {
    const err = validateSltp();
    if (err) {
      toast({
        title: "Invalid SLTP",
        description: err,
        variant: "error",
      });
      return;
    }
    if (!selectedTrade) return;
    if (hasSettleLimit) {
      toast({
        title: "Cancel limit first",
        description:
          "You have a limit close order. Cancel it first to place SLTP.",
        variant: "error",
      });
      return;
    }

    onOpenChange(false);
    toast({
      title: "Placing SLTP order",
      description:
        "Please do not close this page while your order is being processed...",
    });

    const sl = slPrice > 0 ? slPrice : undefined;
    const tp = tpPrice > 0 ? tpPrice : undefined;

    const result = await settleOrderSltp(
      selectedTrade,
      privateKey,
      currentPrice || entryPrice,
      sl,
      tp
    );

    if (!result.success) {
      toast({
        title: "Error placing SLTP",
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
      takeProfit: settledData.take_profit ?? undefined,
      stopLoss: settledData.stop_loss ?? undefined,
      fundingApplied: settledData.funding_applied,
    };

    updateTrade(updatedTradeData);
    addTradeHistory({
      ...updatedTradeData,
      orderStatus: "PENDING",
      orderType: "SLTP",
      takeProfit: settledData.take_profit ?? undefined,
      stopLoss: settledData.stop_loss ?? undefined,
      date: new Date(),
    });

    await queryClient.invalidateQueries({ queryKey: ["sync-trades"] });

    toast({
      title: "SLTP order sent",
      description: "Stop Loss / Take Profit order has been placed.",
    });
  }

  function applyPreset(preset: "sl-2" | "tp-5" | "sl-2-tp-5") {
    const isLong = positionType.toUpperCase() === "LONG";
    if (preset === "sl-2") {
      setSlPrice(isLong ? entryPrice * 0.98 : entryPrice * 1.02);
    } else if (preset === "tp-5") {
      setTpPrice(isLong ? entryPrice * 1.05 : entryPrice * 0.95);
    } else {
      setSlPrice(isLong ? entryPrice * 0.98 : entryPrice * 1.02);
      setTpPrice(isLong ? entryPrice * 1.05 : entryPrice * 0.95);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>Close Position</DialogTitle>
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as "limit" | "sltp")}
        >
          <TabsList variant="underline" className="w-full">
            <TabsTrigger value="limit" variant="underline">
              Limit
            </TabsTrigger>
            <TabsTrigger value="sltp" variant="underline">
              SL/TP
            </TabsTrigger>
          </TabsList>

          <TabsPrimitive.Content value="limit" className="mt-4">
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
                <span className="text-xs text-primary-accent">
                  Position Amount
                </span>
                <span className="text-sm font-medium">{positionSizeBtc} BTC</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-primary-accent">
                  Estimated PnL
                </span>
                <span
                  className={cn(
                    "text-sm font-medium",
                    isPnlLimitPositive && "text-green-medium",
                    isPnlLimitNegative && "text-red",
                    !isPnlLimitPositive && !isPnlLimitNegative && "text-gray-500"
                  )}
                >
                  {isPnlLimitPositive ? "+" : ""}
                  {estimatedPnlLimitBtc} BTC ({estimatedPnlLimitUsd})
                </span>
              </div>
              <div className="border-t" />
              <Button onClick={handleSettleLimit}>Confirm</Button>
            </div>
          </TabsPrimitive.Content>

          <TabsPrimitive.Content value="sltp" className="mt-4">
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

              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-primary-accent shrink-0">
                  Quick presets
                </span>
                <div className="flex gap-1">
                  <Button
                    variant="ui"
                    size="small"
                    onClick={() => applyPreset("sl-2")}
                    className="text-xs"
                  >
                    SL -2%
                  </Button>
                  <Button
                    variant="ui"
                    size="small"
                    onClick={() => applyPreset("tp-5")}
                    className="text-xs"
                  >
                    TP +5%
                  </Button>
                  <Button
                    variant="ui"
                    size="small"
                    onClick={() => applyPreset("sl-2-tp-5")}
                    className="text-xs"
                  >
                    Both
                  </Button>
                </div>
              </div>

              <div className="space-y-1">
                <label
                  className="text-xs text-primary-accent"
                  htmlFor="input-sl-usd"
                >
                  Stop Loss (USD) — optional
                </label>
                <NumberInput
                  id="input-sl-usd"
                  inputValue={slPrice}
                  setInputValue={setSlPrice}
                  currentPrice={currentPrice}
                  placeholder="0.00"
                />
                {slPrice > 0 && (
                  <span
                    className={cn(
                      "text-xs",
                      estimatedPnlSl < 0 ? "text-red" : "text-green-medium"
                    )}
                  >
                    PnL at SL: {formatPnlWithUsd(estimatedPnlSl, currentPrice)}
                  </span>
                )}
              </div>

              <div className="space-y-1">
                <label
                  className="text-xs text-primary-accent"
                  htmlFor="input-tp-usd"
                >
                  Take Profit (USD) — optional
                </label>
                <NumberInput
                  id="input-tp-usd"
                  inputValue={tpPrice}
                  setInputValue={setTpPrice}
                  currentPrice={currentPrice}
                  placeholder="0.00"
                />
                {tpPrice > 0 && (
                  <span
                    className={cn(
                      "text-xs",
                      estimatedPnlTp >= 0 ? "text-green-medium" : "text-red"
                    )}
                  >
                    PnL at TP: {formatPnlWithUsd(estimatedPnlTp, currentPrice)}
                  </span>
                )}
              </div>

              {slPrice > 0 && tpPrice > 0 && (
                <div className="flex items-center justify-between text-xs text-primary-accent">
                  <span>Risk/Reward</span>
                  <span>
                    {(
                      Math.abs(estimatedPnlTp) / Math.abs(estimatedPnlSl || 1)
                    ).toFixed(2)}
                    :1
                  </span>
                </div>
              )}

              <div className="border-t" />
              <div className="flex items-center justify-between">
                <span className="text-xs text-primary-accent">
                  Position Amount
                </span>
                <span className="text-sm font-medium">{positionSizeBtc} BTC</span>
              </div>
              <div className="border-t" />
              <Button onClick={handleSettleSltp}>Confirm</Button>
            </div>
          </TabsPrimitive.Content>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

export default ConditionalCloseDialog;
