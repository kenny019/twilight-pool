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

// ─── helpers ────────────────────────────────────────────────────────────────

/**
 * Compute PnL in USD from a close price.
 * Returns null when inputs are invalid or computation overflows.
 */
function pnlUsdFromPrice(
  closePrice: number,
  entryPrice: number,
  positionSize: number,
  positionType: string,
  btcPriceUsd: number
): number | null {
  if (closePrice <= 0 || entryPrice <= 0 || positionSize === 0 || btcPriceUsd <= 0) return null;
  try {
    const pnlSats = calculateUpnl(entryPrice, closePrice, positionType, positionSize);
    if (!isFinite(pnlSats)) return null;
    // pnlSats → BTC → USD
    const result = new Big(pnlSats).div(100_000_000).mul(btcPriceUsd).toNumber();
    return isFinite(result) ? result : null;
  } catch {
    return null;
  }
}

/**
 * Compute a close price that achieves the requested PnL (USD).
 * Returns null when the PnL is unreachable (e.g. exceeds max possible gain).
 *
 * Derived from calculateUpnl:
 *   LONG:  pnlSats = positionSize * (close - entry) / (entry * close)
 *   SHORT: pnlSats = positionSize * (entry - close) / (entry * close)
 *
 * Inverse:
 *   LONG:  close = positionSize * entry / (positionSize - pnlSats * entry)
 *   SHORT: close = positionSize * entry / (positionSize + pnlSats * entry)
 */
function priceFromPnlUsd(
  pnlUsd: number,
  entryPrice: number,
  positionSize: number,
  positionType: string,
  btcPriceUsd: number
): number | null {
  if (!isFinite(pnlUsd) || entryPrice <= 0 || positionSize === 0 || btcPriceUsd <= 0) return null;
  try {
    const pnlSats = new Big(pnlUsd).div(btcPriceUsd).mul(100_000_000).toNumber();
    if (!isFinite(pnlSats)) return null;
    const isLong = positionType.toUpperCase() === "LONG";
    const denom = isLong
      ? positionSize - pnlSats * entryPrice
      : positionSize + pnlSats * entryPrice;
    if (Math.abs(denom) < 1e-9) return null; // avoid division by zero
    const close = (positionSize * entryPrice) / denom;
    if (!isFinite(close) || close <= 0) return null;
    return close;
  } catch {
    return null;
  }
}

// ─── component ──────────────────────────────────────────────────────────────

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

  // ── limit tab state ──────────────────────────────────────────────────────
  const [limitPrice, setLimitPrice] = useState(currentPrice || 0);

  // ── sltp tab state ───────────────────────────────────────────────────────
  // Prices (set by price field OR derived from PnL field)
  const [slPrice, setSlPrice] = useState(0);
  const [tpPrice, setTpPrice] = useState(0);
  // PnL fields — when null the value is derived from the price; when non-null
  // the user has typed a PnL value and we derive the price from it.
  const [slPnlInput, setSlPnlInput] = useState<number>(0);
  const [tpPnlInput, setTpPnlInput] = useState<number>(0);
  // Which field did the user edit last per leg? "price" | "pnl"
  const [slLastEdited, setSlLastEdited] = useState<"price" | "pnl">("price");
  const [tpLastEdited, setTpLastEdited] = useState<"price" | "pnl">("price");

  const selectedTrade = trades.find((trade) => trade.accountAddress === account);
  const queryClient = useQueryClient();

  const entryPrice = selectedTrade?.entryPrice || 0;
  const markPrice = currentPrice || entryPrice;
  const positionSize = selectedTrade?.positionSize || 0;
  const positionType = selectedTrade?.positionType || "";

  // Position amount in USD (2 dp) — matches columns rendering convention where
  // positionSize treated as sats-equivalent gives the USD display value.
  const positionSizeUsd = new BTC("sats", Big(positionSize)).convert("BTC").toFixed(2);

  const hasSltp = !!(selectedTrade?.takeProfit || selectedTrade?.stopLoss);

  // ── initialise state when dialog opens ──────────────────────────────────
  // Pre-populate SL/TP from existing values if they are set; otherwise start
  // at 0 so the user can freely enter their desired price.
  useEffect(() => {
    if (!open) return;

    setActiveTab(initialTab);
    setLimitPrice(currentPrice || 0);

    const existingSl = selectedTrade?.stopLoss
      ? Number(selectedTrade.stopLoss.sl_price)
      : 0;
    const existingTp = selectedTrade?.takeProfit
      ? Number(selectedTrade.takeProfit.tp_price)
      : 0;

    setSlPrice(existingSl);
    setTpPrice(existingTp);

    // Derive initial PnL display values from the existing prices
    const btcPrice = currentPrice || storedBtcPrice;
    setSlPnlInput(
      existingSl > 0
        ? (pnlUsdFromPrice(existingSl, entryPrice, positionSize, positionType, btcPrice) ?? 0)
        : 0
    );
    setTpPnlInput(
      existingTp > 0
        ? (pnlUsdFromPrice(existingTp, entryPrice, positionSize, positionType, btcPrice) ?? 0)
        : 0
    );
    setSlLastEdited("price");
    setTpLastEdited("price");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialTab]);

  // ── limit tab estimated PnL ──────────────────────────────────────────────
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

  // ── sltp derived values ──────────────────────────────────────────────────
  const btcPrice = currentPrice || storedBtcPrice;

  // Derived PnL (USD) from each price — used when user edited the price field
  const derivedSlPnlUsd = slPrice > 0
    ? (pnlUsdFromPrice(slPrice, entryPrice, positionSize, positionType, btcPrice) ?? 0)
    : 0;
  const derivedTpPnlUsd = tpPrice > 0
    ? (pnlUsdFromPrice(tpPrice, entryPrice, positionSize, positionType, btcPrice) ?? 0)
    : 0;

  // What the PnL fields actually display
  const displaySlPnl = slLastEdited === "price" ? derivedSlPnlUsd : slPnlInput;
  const displayTpPnl = tpLastEdited === "price" ? derivedTpPnlUsd : tpPnlInput;

  // Risk/Reward: only shown when both are set
  const slPnlSats = calculateUpnl(entryPrice, slPrice, positionType, positionSize);
  const tpPnlSats = calculateUpnl(entryPrice, tpPrice, positionType, positionSize);

  // ── handlers for bidirectional price ↔ PnL ──────────────────────────────
  function handleSlPriceChange(val: number) {
    setSlPrice(val);
    setSlLastEdited("price");
    // Keep PnL input in sync so it doesn't look stale when user switches back
    const pnl = val > 0
      ? (pnlUsdFromPrice(val, entryPrice, positionSize, positionType, btcPrice) ?? 0)
      : 0;
    setSlPnlInput(pnl);
  }

  function handleSlPnlChange(val: number) {
    if (!isFinite(val)) return;
    setSlPnlInput(val);
    setSlLastEdited("pnl");
    const derived = val !== 0
      ? (priceFromPnlUsd(val, entryPrice, positionSize, positionType, btcPrice) ?? 0)
      : 0;
    setSlPrice(derived);
  }

  function handleTpPriceChange(val: number) {
    setTpPrice(val);
    setTpLastEdited("price");
    const pnl = val > 0
      ? (pnlUsdFromPrice(val, entryPrice, positionSize, positionType, btcPrice) ?? 0)
      : 0;
    setTpPnlInput(pnl);
  }

  function handleTpPnlChange(val: number) {
    if (!isFinite(val)) return;
    setTpPnlInput(val);
    setTpLastEdited("pnl");
    const derived = val !== 0
      ? (priceFromPnlUsd(val, entryPrice, positionSize, positionType, btcPrice) ?? 0)
      : 0;
    setTpPrice(derived);
  }

  // ── quick presets ────────────────────────────────────────────────────────
  function applyPreset(preset: "sl-2" | "tp-5" | "sl-2-tp-5") {
    const isLong = positionType.toUpperCase() === "LONG";
    if (preset === "sl-2" || preset === "sl-2-tp-5") {
      handleSlPriceChange(isLong ? entryPrice * 0.98 : entryPrice * 1.02);
    }
    if (preset === "tp-5" || preset === "sl-2-tp-5") {
      handleTpPriceChange(isLong ? entryPrice * 1.05 : entryPrice * 0.95);
    }
  }

  // ── validation ───────────────────────────────────────────────────────────
  function validateSltp(): string | null {
    if (!selectedTrade) return "Please select a valid trade";
    const hasSl = slPrice > 0;
    const hasTp = tpPrice > 0;
    if (!hasSl && !hasTp) {
      return "At least one of Stop Loss or Take Profit is required";
    }
    if (hasSl && hasTp && Math.abs(slPrice - tpPrice) < 0.01) {
      return "Stop Loss and Take Profit cannot be the same price";
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

  // ── submit handlers ──────────────────────────────────────────────────────
  async function handleSettleLimit() {
    if (limitPrice <= 0) {
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
    // Limit and SLTP are allowed to coexist — no mutual exclusion check.

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
      isOpen: true,
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
    // Limit and SLTP are allowed to coexist — no mutual exclusion check.

    const isUpdate = hasSltp;

    onOpenChange(false);
    toast({
      title: isUpdate ? "Updating SLTP order" : "Placing SLTP order",
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

    // The position stays FILLED and open — isOpen must remain true.
    // take_profit / stop_loss may not yet be in the API response; fall back to
    // the values we just submitted so the UI reflects them immediately.
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
      isOpen: true, // position remains open — SLTP only sets trigger conditions
      feeSettled: Big(settledData.fee_settled).toNumber(),
      feeFilled: Big(settledData.fee_filled).toNumber(),
      realizedPnl: Big(settledData.unrealized_pnl).toNumber(),
      tx_hash: settledData.tx_hash || selectedTrade.tx_hash,
      liquidationPrice: Big(settledData.liquidation_price).toNumber(),
      bankruptcyPrice: Big(settledData.bankruptcy_price).toNumber(),
      bankruptcyValue: Big(settledData.bankruptcy_value).toNumber(),
      initialMargin: Big(settledData.initial_margin).toNumber(),
      // Prefer the API response values; fall back to submitted values when the
      // API does not yet return take_profit / stop_loss fields.
      takeProfit:
        settledData.take_profit !== undefined
          ? (settledData.take_profit ?? undefined)
          : tp
            ? { tp_price: String(tp), timestamp: new Date().toISOString() }
            : selectedTrade.takeProfit ?? undefined,
      stopLoss:
        settledData.stop_loss !== undefined
          ? (settledData.stop_loss ?? undefined)
          : sl
            ? { sl_price: String(sl), timestamp: new Date().toISOString() }
            : selectedTrade.stopLoss ?? undefined,
      fundingApplied: settledData.funding_applied,
    };

    updateTrade(updatedTradeData);
    addTradeHistory({
      ...updatedTradeData,
      orderStatus: "PENDING",
      orderType: "SLTP",
      takeProfit: updatedTradeData.takeProfit,
      stopLoss: updatedTradeData.stopLoss,
      date: new Date(),
    });

    await queryClient.invalidateQueries({ queryKey: ["sync-trades"] });

    toast({
      title: isUpdate ? "SLTP order updated" : "SLTP order placed",
      description: "Stop Loss / Take Profit order has been set.",
    });
  }

  // ── render ───────────────────────────────────────────────────────────────
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

          {/* ── Limit tab ─────────────────────────────────────────────── */}
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
                <span className="text-sm font-medium">${positionSizeUsd}</span>
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

          {/* ── SL/TP tab ──────────────────────────────────────────────── */}
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

              {/* Quick presets */}
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

              {/* ── Stop Loss ─────────────────────────────────────── */}
              <div className="space-y-2">
                <span className="text-xs font-medium text-red">
                  Stop Loss — optional
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label
                      className="text-xs text-primary-accent"
                      htmlFor="input-sl-price"
                    >
                      Price (USD)
                    </label>
                    <NumberInput
                      id="input-sl-price"
                      inputValue={slPrice}
                      setInputValue={handleSlPriceChange}
                      currentPrice={currentPrice}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-1">
                    <label
                      className="text-xs text-primary-accent"
                      htmlFor="input-sl-pnl"
                    >
                      PnL (USD)
                    </label>
                    <NumberInput
                      id="input-sl-pnl"
                      inputValue={isFinite(displaySlPnl) ? Number(displaySlPnl.toFixed(2)) : 0}
                      setInputValue={handleSlPnlChange}
                      currentPrice={0}
                      placeholder="0.00"
                    />
                  </div>
                </div>
                {slPrice > 0 && isFinite(displaySlPnl) && (
                  <p
                    className={cn(
                      "text-xs",
                      displaySlPnl < 0 ? "text-red" : "text-green-medium"
                    )}
                  >
                    Est. PnL at SL:{" "}
                    {displaySlPnl >= 0 ? "+" : ""}
                    {displaySlPnl.toFixed(2)} USD
                  </p>
                )}
              </div>

              {/* ── Take Profit ───────────────────────────────────── */}
              <div className="space-y-2">
                <span className="text-xs font-medium text-green-medium">
                  Take Profit — optional
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label
                      className="text-xs text-primary-accent"
                      htmlFor="input-tp-price"
                    >
                      Price (USD)
                    </label>
                    <NumberInput
                      id="input-tp-price"
                      inputValue={tpPrice}
                      setInputValue={handleTpPriceChange}
                      currentPrice={currentPrice}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-1">
                    <label
                      className="text-xs text-primary-accent"
                      htmlFor="input-tp-pnl"
                    >
                      PnL (USD)
                    </label>
                    <NumberInput
                      id="input-tp-pnl"
                      inputValue={isFinite(displayTpPnl) ? Number(displayTpPnl.toFixed(2)) : 0}
                      setInputValue={handleTpPnlChange}
                      currentPrice={0}
                      placeholder="0.00"
                    />
                  </div>
                </div>
                {tpPrice > 0 && isFinite(displayTpPnl) && (
                  <p
                    className={cn(
                      "text-xs",
                      displayTpPnl >= 0 ? "text-green-medium" : "text-red"
                    )}
                  >
                    Est. PnL at TP:{" "}
                    {displayTpPnl >= 0 ? "+" : ""}
                    {displayTpPnl.toFixed(2)} USD
                  </p>
                )}
              </div>

              {/* Risk/Reward ratio */}
              {slPrice > 0 && tpPrice > 0 && (
                <div className="flex items-center justify-between text-xs text-primary-accent">
                  <span>Risk/Reward</span>
                  <span>
                    {(
                      Math.abs(tpPnlSats) / Math.abs(slPnlSats || 1)
                    ).toFixed(2)}
                    :1
                  </span>
                </div>
              )}

              {hasSltp && (
                <p className="text-xs text-primary-accent">
                  You already have an active SL/TP — confirming will update it.
                </p>
              )}

              <div className="border-t" />
              <div className="flex items-center justify-between">
                <span className="text-xs text-primary-accent">
                  Position Amount
                </span>
                <span className="text-sm font-medium">${positionSizeUsd}</span>
              </div>
              <div className="border-t" />
              <Button onClick={handleSettleSltp}>
                {hasSltp ? "Update SL/TP" : "Confirm"}
              </Button>
            </div>
          </TabsPrimitive.Content>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

export default ConditionalCloseDialog;
