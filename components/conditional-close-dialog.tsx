"use client";

import { useTwilightStore } from "@/lib/providers/store";
import React, { useEffect, useState } from "react";
import { Dialog, DialogTitle } from "./dialog";
import { Sheet, SheetContent } from "./sheet";
import { NumberInput } from "./input";
import Button from "./button";
import { useToast } from "@/lib/hooks/useToast";
import { settleOrder, settleOrderSltp } from "@/lib/zk/trade";
import { useSessionStore, useSignStatus } from "@/lib/providers/session";
import { usePriceFeed } from "@/lib/providers/feed";
import Link from "next/link";
import Big from "big.js";
import dayjs from "dayjs";
import { useQueryClient } from "@tanstack/react-query";
import cn from "@/lib/cn";
import BTC from "@/lib/twilight/denoms";
import { calculateUpnl } from "@/app/_components/trade/orderbook/my-trades/columns";
import { formatCurrency } from "@/lib/twilight/ticker";
import { Tabs, TabsList, TabsTrigger } from "./tabs";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { Slider } from "./slider";

type Props = {
  account?: string;
  initialTab?: "limit" | "sltp";
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

// ─── constants (frontend UX guardrails only — relayer is authoritative) ─────

const MIN_PRICE_DISTANCE_PCT = 0.001; // 0.1%
const TP_WARNING_POOL_EQUITY_RATIO = 0.02; // 2%

// ─── helpers ────────────────────────────────────────────────────────────────

/**
 * Compute PnL in BTC from a close price.
 * Returns null when inputs are invalid or computation overflows.
 */
function pnlBtcFromPrice(
  closePrice: number,
  entryPrice: number,
  positionSize: number,
  positionType: string
): number | null {
  if (closePrice <= 0 || entryPrice <= 0 || positionSize === 0) return null;
  try {
    const normalizedPositionType = positionType.trim().toUpperCase();
    const canonicalPositionType =
      normalizedPositionType === "BUY"
        ? "LONG"
        : normalizedPositionType === "SELL"
          ? "SHORT"
          : normalizedPositionType;
    // Avoid silent 0 from calculateUpnl when side comes back in a non-canonical
    // variant (e.g. BUY/SELL). Fallback to LONG semantics if unknown.
    const safePositionType =
      canonicalPositionType === "LONG" || canonicalPositionType === "SHORT"
        ? canonicalPositionType
        : "LONG";
    const pnlSats = calculateUpnl(
      entryPrice,
      closePrice,
      safePositionType,
      positionSize
    );
    if (!isFinite(pnlSats)) return null;
    const result = new Big(pnlSats).div(100_000_000).toNumber();
    return isFinite(result) ? result : null;
  } catch {
    return null;
  }
}

/**
 * Compute a close price that achieves the requested PnL (BTC).
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
function priceFromPnlBtc(
  pnlBtc: number,
  entryPrice: number,
  positionSize: number,
  positionType: string
): number | null {
  if (!isFinite(pnlBtc) || entryPrice <= 0 || positionSize === 0) return null;
  try {
    const pnlSats = new Big(pnlBtc).mul(100_000_000).toNumber();
    if (!isFinite(pnlSats)) return null;
    const normalizedPositionType = positionType.trim().toUpperCase();
    const canonicalPositionType =
      normalizedPositionType === "BUY"
        ? "LONG"
        : normalizedPositionType === "SELL"
          ? "SHORT"
          : normalizedPositionType;
    const isLong = canonicalPositionType !== "SHORT";
    const denom = isLong
      ? positionSize - pnlSats * entryPrice
      : positionSize + pnlSats * entryPrice;
    if (Math.abs(denom) < 1e-9) return null;
    const close = (positionSize * entryPrice) / denom;
    return isFinite(close) && close > 0 ? close : null;
  } catch {
    return null;
  }
}

// ─── types ───────────────────────────────────────────────────────────────────

type ValidationErrors = { sl?: string; tp?: string; global?: string };

function PriceBarLabel({
  left,
  label,
  toneClassName,
  position = "top",
}: {
  left: number;
  label: string;
  toneClassName?: string;
  position?: "top" | "bottom";
}) {
  return (
    <div
      className={cn(
        "absolute -translate-x-1/2 whitespace-nowrap rounded bg-background px-1 py-0.5 text-[10px] shadow-sm ring-1 ring-outline",
        position === "top" ? "bottom-full mb-1" : "top-full mt-1",
        toneClassName
      )}
      style={{ left: `${Math.min(Math.max(left, 6), 94)}%` }}
    >
      {label}
    </div>
  );
}

// ─── component ───────────────────────────────────────────────────────────────

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
  const poolInfo = useTwilightStore((state) => state.lend.poolInfo);
  const privateKey = useSessionStore((state) => state.privateKey);
  const { retrySign } = useSignStatus();
  const storedBtcPrice = useSessionStore((state) => state.price.btcPrice);

  const { getCurrentPrice } = usePriceFeed();
  const liveBtcPrice = getCurrentPrice();
  const currentPrice = liveBtcPrice || storedBtcPrice;

  // ── limit tab state ──────────────────────────────────────────────────────
  const [limitPrice, setLimitPrice] = useState(currentPrice || 0);

  // ── sltp tab state ───────────────────────────────────────────────────────
  // Explicit enable/disable per leg — 0 no longer means "not set"
  const [slEnabled, setSlEnabled] = useState(false);
  const [tpEnabled, setTpEnabled] = useState(false);
  // Prices (set by price field OR derived from PnL field) — preserved when leg is removed
  const [slPrice, setSlPrice] = useState(0);
  const [tpPrice, setTpPrice] = useState(0);
  // PnL fields — when null the value is derived from the price; when non-null
  // the user has typed a PnL value and we derive the price from it.
  const [slPnlInput, setSlPnlInput] = useState<number>(0);
  const [tpPnlInput, setTpPnlInput] = useState<number>(0);
  // Which field did the user edit last per leg? "price" | "pnl"
  const [slLastEdited, setSlLastEdited] = useState<"price" | "pnl">("price");
  const [tpLastEdited, setTpLastEdited] = useState<"price" | "pnl">("price");

  const selectedTrade = trades.find(
    (trade) => trade.accountAddress === account
  );
  const queryClient = useQueryClient();

  const entryPrice = selectedTrade?.entryPrice || 0;
  const markPrice = currentPrice || entryPrice;
  const rawPositionSize = selectedTrade?.positionSize || 0;
  const initialMargin = selectedTrade?.initialMargin || 0;
  const availableMargin = selectedTrade?.availableMargin || 0;
  const marginFallback = Math.max(initialMargin, availableMargin);
  const leverage = selectedTrade?.leverage || 1;
  const fallbackFromMargin =
    marginFallback > 0 && markPrice > 0
      ? Math.round(marginFallback * markPrice * Math.max(leverage, 1))
      : 0;
  // Fallback when API omits positionSize (e.g. after SLTP response) — use margin * leverage
  const positionSize =
    rawPositionSize > 0
      ? rawPositionSize
      : fallbackFromMargin > 0
        ? fallbackFromMargin
        : Math.round((selectedTrade?.value || 0) * Math.max(leverage, 1));
  const positionType = (selectedTrade?.positionType || "").trim();
  const btcPrice = currentPrice || storedBtcPrice;
  const isLong = positionType.toUpperCase() !== "SHORT";
  const liquidationPrice = selectedTrade?.liquidationPrice ?? 0;
  // positionSize/1e8 is the USD value (internal convention); divide by btcPrice for actual BTC
  const positionSizeDisplayBtc =
    btcPrice > 0 ? positionSize / 1e8 / btcPrice : 0;
  const poolEquityBtc = poolInfo?.tvl_btc ?? null;

  // Position amount in USD (2 dp) — matches columns rendering convention where
  // positionSize treated as sats-equivalent gives the USD display value.
  const positionSizeUsd = new BTC("sats", Big(positionSize))
    .convert("BTC")
    .toFixed(2);

  const hasSltp = !!(selectedTrade?.takeProfit || selectedTrade?.stopLoss);
  const hasLimit = !!selectedTrade?.settleLimit;

  // ── initialise state when dialog opens ──────────────────────────────────
  // Pre-populate SL/TP from existing values if they are set; otherwise start
  // at 0 so the user can freely enter their desired price.
  useEffect(() => {
    if (!open) return;

    setActiveTab(initialTab);
    setLimitPrice(currentPrice || 0);

    const existingSl = selectedTrade?.stopLoss
      ? Number(selectedTrade.stopLoss.price)
      : 0;
    const existingTp = selectedTrade?.takeProfit
      ? Number(selectedTrade.takeProfit.price)
      : 0;

    setSlEnabled(existingSl > 0);
    setTpEnabled(existingTp > 0);
    setSlPrice(existingSl);
    setTpPrice(existingTp);

    // Derive initial BTC PnL display values from the existing prices
    setSlPnlInput(
      existingSl > 0
        ? (pnlBtcFromPrice(
            existingSl,
            entryPrice,
            positionSize,
            positionType
          ) ?? 0)
        : 0
    );
    setTpPnlInput(
      existingTp > 0
        ? (pnlBtcFromPrice(
            existingTp,
            entryPrice,
            positionSize,
            positionType
          ) ?? 0)
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
  const estimatedPnlLimitBtcBig = new BTC(
    "sats",
    Big(estimatedPnlLimit)
  ).convert("BTC");
  const estimatedPnlLimitBtcStr = BTC.format(estimatedPnlLimitBtcBig, "BTC");
  // Use btcPrice (has storedBtcPrice fallback) to avoid $0.00 when live price snapshot is 0
  const estimatedPnlLimitUsdNum =
    btcPrice > 0 ? estimatedPnlLimitBtcBig.toNumber() * btcPrice : 0;
  const isPnlLimitPositive = estimatedPnlLimit > 0;
  const isPnlLimitNegative = estimatedPnlLimit < 0;

  // ── limit tab derived values ─────────────────────────────────────────────

  // Distance from entry to liquidation (% magnitude) — used by both limit and SL sliders
  const liqDistancePct =
    entryPrice > 0 && liquidationPrice > 0
      ? Math.abs((liquidationPrice - entryPrice) / entryPrice) * 100
      : null;

  const limitDistanceFromEntryPct =
    entryPrice > 0 && limitPrice > 0
      ? ((limitPrice - entryPrice) / entryPrice) * 100
      : null;
  // Extend loss side to 99% of the way to liquidation; profit side capped at 50%
  const limitLossMaxAbs = liqDistancePct != null ? liqDistancePct * 0.99 : 30;
  const limitSliderRange = isLong
    ? { min: -limitLossMaxAbs, max: 50 }
    : { min: -50, max: limitLossMaxAbs };
  const limitSliderPct =
    limitDistanceFromEntryPct != null
      ? Math.min(
          Math.max(limitDistanceFromEntryPct, limitSliderRange.min),
          limitSliderRange.max
        )
      : 0;
  // Thumb position as % of slider track width (clamped to avoid edge clip)
  const thumbTrackPct =
    limitSliderRange.max !== limitSliderRange.min
      ? ((limitSliderPct - limitSliderRange.min) /
          (limitSliderRange.max - limitSliderRange.min)) *
        100
      : 50;
  const thumbDisplayPct = Math.min(Math.max(thumbTrackPct, 5), 95);

  const limitProfitPresets = isLong ? [2, 5, 10, 20] : [-2, -5, -10, -20];
  const limitLossPresets = isLong ? [-2, -5, -10] : [2, 5, 10];
  // Unified warning: limit is on wrong side of mark (covers both "near mark" and "wrong side")
  const limitMayExecuteImmediately =
    limitPrice > 0 &&
    markPrice > 0 &&
    ((isLong && limitPrice <= markPrice) ||
      (!isLong && limitPrice >= markPrice));
  const limitBeyondLiq =
    liquidationPrice > 0 && limitPrice > 0
      ? (isLong && limitPrice <= liquidationPrice) ||
        (!isLong && limitPrice >= liquidationPrice)
      : false;

  // Visualization bar for limit tab
  const limitBarPrices = [
    liquidationPrice,
    limitPrice,
    entryPrice,
    markPrice,
  ].filter((p) => p > 0);
  const limitBarMin =
    limitBarPrices.length > 0 ? Math.min(...limitBarPrices) * 0.99 : 0;
  const limitBarMax =
    limitBarPrices.length > 0 ? Math.max(...limitBarPrices) * 1.01 : 1;
  const limitBarRange = limitBarMax - limitBarMin;
  const toLimitBarPct = (p: number) =>
    limitBarRange > 0
      ? Math.min(Math.max(((p - limitBarMin) / limitBarRange) * 100, 0), 100)
      : 0;
  const limitLiqBarPct =
    liquidationPrice > 0 ? toLimitBarPct(liquidationPrice) : null;
  const limitEntryBarPct = entryPrice > 0 ? toLimitBarPct(entryPrice) : null;
  const limitMarkBarPct = markPrice > 0 ? toLimitBarPct(markPrice) : null;
  const limitPriceBarPct = limitPrice > 0 ? toLimitBarPct(limitPrice) : null;

  // ── sltp derived values ──────────────────────────────────────────────────
  // BTC PnL derived from each price — used when user edited the price field
  const derivedSlPnlBtc =
    slPrice > 0 && entryPrice > 0
      ? (pnlBtcFromPrice(slPrice, entryPrice, positionSize, positionType) ?? 0)
      : 0;
  const derivedTpPnlBtc =
    tpPrice > 0 && entryPrice > 0
      ? (pnlBtcFromPrice(tpPrice, entryPrice, positionSize, positionType) ?? 0)
      : 0;

  // What the PnL fields actually display (BTC)
  const displaySlPnlBtc =
    slLastEdited === "price" ? derivedSlPnlBtc : slPnlInput;
  const displayTpPnlBtc =
    tpLastEdited === "price" ? derivedTpPnlBtc : tpPnlInput;

  // USD equivalents for helper text only
  const displaySlPnlUsd = isFinite(displaySlPnlBtc)
    ? displaySlPnlBtc * btcPrice
    : 0;
  const displayTpPnlUsd = isFinite(displayTpPnlBtc)
    ? displayTpPnlBtc * btcPrice
    : 0;
  const slPnlDisplay = isFinite(displaySlPnlBtc)
    ? parseFloat(displaySlPnlBtc.toFixed(8))
    : 0;
  const tpPnlDisplay = isFinite(displayTpPnlBtc)
    ? parseFloat(displayTpPnlBtc.toFixed(8))
    : 0;

  // Distance from mark (%) — used by sliders; more intuitive for active traders
  const slDistanceFromMarkPct =
    markPrice > 0 && slPrice > 0
      ? ((slPrice - markPrice) / markPrice) * 100
      : null;
  const tpDistanceFromMarkPct =
    markPrice > 0 && tpPrice > 0
      ? ((tpPrice - markPrice) / markPrice) * 100
      : null;
  const liqDistanceFromMarkPct =
    markPrice > 0 && liquidationPrice > 0
      ? Math.abs((liquidationPrice - markPrice) / markPrice) * 100
      : null;

  // Slider ranges relative to mark price, capped near liquidation for SL
  const slSliderMaxAbs =
    liqDistanceFromMarkPct != null
      ? Math.min(30, liqDistanceFromMarkPct * 0.98)
      : 30;
  const slSliderRange = isLong
    ? { min: -slSliderMaxAbs, max: -0.1 }
    : { min: 0.1, max: slSliderMaxAbs };
  const tpSliderRange = isLong
    ? { min: 0.1, max: 50 }
    : { min: -50, max: -0.1 };
  const slSliderPct =
    slDistanceFromMarkPct != null
      ? Math.min(
          Math.max(slDistanceFromMarkPct, slSliderRange.min),
          slSliderRange.max
        )
      : isLong
        ? -2
        : 2;
  const tpSliderPct =
    tpDistanceFromMarkPct != null
      ? Math.min(
          Math.max(tpDistanceFromMarkPct, tpSliderRange.min),
          tpSliderRange.max
        )
      : isLong
        ? 5
        : -5;

  // Pool equity warning (non-blocking)
  const showTpPoolWarning =
    tpEnabled &&
    poolEquityBtc != null &&
    tpPrice > 0 &&
    displayTpPnlBtc > TP_WARNING_POOL_EQUITY_RATIO * poolEquityBtc;

  // Near-liquidation warning (non-blocking)
  const slNearLiquidation =
    slEnabled &&
    slPrice > 0 &&
    liquidationPrice > 0 &&
    ((isLong && slPrice < liquidationPrice * 1.05) ||
      (!isLong && slPrice > liquidationPrice * 0.95));

  // Per-leg preset chips
  const slPresets = isLong ? [-2, -5, -10] : [2, 5, 10];
  const tpPresets = isLong ? [5, 10, 25] : [-5, -10, -25];

  // Visualization bar — only include enabled legs' prices
  const barPrices = [
    liquidationPrice,
    ...(slEnabled && slPrice > 0 ? [slPrice] : []),
    entryPrice,
    ...(tpEnabled && tpPrice > 0 ? [tpPrice] : []),
    markPrice,
  ].filter((p) => p > 0);
  const barMin = barPrices.length > 0 ? Math.min(...barPrices) * 0.99 : 0;
  const barMax = barPrices.length > 0 ? Math.max(...barPrices) * 1.01 : 1;
  const barRange = barMax - barMin;
  const toBarPct = (p: number) =>
    barRange > 0
      ? Math.min(Math.max(((p - barMin) / barRange) * 100, 0), 100)
      : 0;

  const liqBarPct = liquidationPrice > 0 ? toBarPct(liquidationPrice) : null;
  const slBarPct = slEnabled && slPrice > 0 ? toBarPct(slPrice) : null;
  const entryBarPct = entryPrice > 0 ? toBarPct(entryPrice) : null;
  const tpBarPct = tpEnabled && tpPrice > 0 ? toBarPct(tpPrice) : null;
  const markBarPct = markPrice > 0 ? toBarPct(markPrice) : null;

  // R:R — only meaningful when both legs enabled and SL is loss, TP is gain
  const hasRR = slEnabled && tpEnabled && slPrice > 0 && tpPrice > 0;
  const rrRatio =
    hasRR &&
    displaySlPnlBtc < 0 &&
    displayTpPnlBtc > 0 &&
    Math.abs(displaySlPnlBtc) > 0
      ? displayTpPnlBtc / Math.abs(displaySlPnlBtc)
      : null;

  // ── handlers for bidirectional price ↔ BTC PnL ──────────────────────────
  function handleSlPriceChange(val: number) {
    setSlPrice(val);
    setSlLastEdited("price");
    setSlPnlInput(
      val > 0
        ? (pnlBtcFromPrice(val, entryPrice, positionSize, positionType) ?? 0)
        : 0
    );
  }

  function handleSlPnlChange(val: number) {
    if (!isFinite(val)) return;
    setSlPnlInput(val);
    setSlLastEdited("pnl");
    setSlPrice(
      val !== 0
        ? (priceFromPnlBtc(val, entryPrice, positionSize, positionType) ?? 0)
        : 0
    );
  }

  function handleTpPriceChange(val: number) {
    setTpPrice(val);
    setTpLastEdited("price");
    setTpPnlInput(
      val > 0
        ? (pnlBtcFromPrice(val, entryPrice, positionSize, positionType) ?? 0)
        : 0
    );
  }

  function handleTpPnlChange(val: number) {
    if (!isFinite(val)) return;
    setTpPnlInput(val);
    setTpLastEdited("pnl");
    setTpPrice(
      val !== 0
        ? (priceFromPnlBtc(val, entryPrice, positionSize, positionType) ?? 0)
        : 0
    );
  }

  // ── validation ───────────────────────────────────────────────────────────
  function getValidationErrors(): ValidationErrors {
    const errors: ValidationErrors = {};

    if (!slEnabled && !tpEnabled) {
      errors.global = "Add at least one of Stop Loss or Take Profit.";
      return errors;
    }
    if (slEnabled && slPrice <= 0) {
      errors.sl = "Enter a stop loss price.";
      return errors;
    }
    if (tpEnabled && tpPrice <= 0) {
      errors.tp = "Enter a take profit price.";
      return errors;
    }
    if (slEnabled) {
      if (isLong) {
        if (slPrice >= markPrice * (1 - MIN_PRICE_DISTANCE_PCT))
          errors.sl = "Stop loss must be below the current price.";
        else if (
          liquidationPrice > 0 &&
          slPrice <= liquidationPrice * (1 + MIN_PRICE_DISTANCE_PCT)
        )
          errors.sl = "Stop loss must remain above liquidation price.";
      } else {
        if (slPrice <= markPrice * (1 + MIN_PRICE_DISTANCE_PCT))
          errors.sl = "Stop loss must be above the current price.";
        else if (
          liquidationPrice > 0 &&
          slPrice >= liquidationPrice * (1 - MIN_PRICE_DISTANCE_PCT)
        )
          errors.sl = "Stop loss must remain below liquidation price.";
      }
    }
    if (tpEnabled) {
      const tpPnlBtc =
        pnlBtcFromPrice(tpPrice, entryPrice, positionSize, positionType) ?? 0;
      if (isLong) {
        if (tpPrice <= markPrice * (1 + MIN_PRICE_DISTANCE_PCT))
          errors.tp = "Take profit must be above the current price.";
        else if (tpPnlBtc >= positionSizeDisplayBtc)
          errors.tp = "Take profit must be less than the position size in BTC.";
      } else {
        if (tpPrice >= markPrice * (1 - MIN_PRICE_DISTANCE_PCT))
          errors.tp = "Take profit must be below the current price.";
        else if (tpPnlBtc >= positionSizeDisplayBtc)
          errors.tp = "Take profit must be less than the position size in BTC.";
      }
    }
    if (slEnabled && tpEnabled) {
      if ((isLong && slPrice >= tpPrice) || (!isLong && tpPrice >= slPrice))
        errors.global = "Stop loss and take profit values are crossed.";
    }
    return errors;
  }

  const validationErrors = getValidationErrors();
  const hasBlockingError = !!(
    validationErrors.sl ||
    validationErrors.tp ||
    validationErrors.global
  );
  const hasUserInput = slEnabled || tpEnabled;

  // Block Update when values are unchanged (avoids redundant API calls).
  // When a leg is disabled, only compare enabled legs — disabling a leg
  // alone (same values for the rest) is treated as no change.
  const existingSlPrice = selectedTrade?.stopLoss
    ? Number(selectedTrade.stopLoss.price)
    : undefined;
  const existingTpPrice = selectedTrade?.takeProfit
    ? Number(selectedTrade.takeProfit.price)
    : undefined;
  const proposedSl = slEnabled && slPrice > 0 ? slPrice : undefined;
  const proposedTp = tpEnabled && tpPrice > 0 ? tpPrice : undefined;
  const PRICE_EPSILON = 0.01;
  const slMatches =
    (proposedSl == null && existingSlPrice == null) ||
    (proposedSl != null &&
      existingSlPrice != null &&
      Math.abs(proposedSl - existingSlPrice) < PRICE_EPSILON);
  const tpMatches =
    (proposedTp == null && existingTpPrice == null) ||
    (proposedTp != null &&
      existingTpPrice != null &&
      Math.abs(proposedTp - existingTpPrice) < PRICE_EPSILON);
  // Only require match for enabled legs; disabled legs are ignored
  const isNoChange =
    hasSltp && (slEnabled ? slMatches : true) && (tpEnabled ? tpMatches : true);

  // ── submit handlers ──────────────────────────────────────────────────────
  async function handleSettleLimit() {
    if (!privateKey) {
      await retrySign();
      return;
    }

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
    const parsedPositionSize = Number(settledData.positionsize);
    const parsedInitialMargin = Number(settledData.initial_margin);
    const parsedLeverage = Number(settledData.leverage);
    const normalizedPositionType =
      typeof settledData.position_type === "string"
        ? settledData.position_type.toUpperCase()
        : "";

    const updatedTradeData = {
      ...selectedTrade,
      orderStatus: settledData.order_status,
      availableMargin: Big(settledData.available_margin).toNumber(),
      maintenanceMargin: Big(settledData.maintenance_margin).toNumber(),
      unrealizedPnl: Big(settledData.unrealized_pnl).toNumber(),
      settlementPrice: Big(settledData.settlement_price).toNumber(),
      positionSize:
        Number.isFinite(parsedPositionSize) && parsedPositionSize > 0
          ? parsedPositionSize
          : selectedTrade.positionSize,
      positionType:
        normalizedPositionType === "LONG" || normalizedPositionType === "SHORT"
          ? normalizedPositionType
          : selectedTrade.positionType,
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
      initialMargin:
        Number.isFinite(parsedInitialMargin) && parsedInitialMargin > 0
          ? parsedInitialMargin
          : selectedTrade.initialMargin,
      leverage:
        Number.isFinite(parsedLeverage) && parsedLeverage > 0
          ? parsedLeverage
          : selectedTrade.leverage,
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
    if (!privateKey) {
      await retrySign();
      return;
    }

    const errors = getValidationErrors();
    const firstError = errors.sl ?? errors.tp ?? errors.global;
    if (firstError) {
      toast({
        title: "Invalid SLTP",
        description: firstError,
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

    const sl = slEnabled && slPrice > 0 ? slPrice : undefined;
    const tp = tpEnabled && tpPrice > 0 ? tpPrice : undefined;

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
    const parsedPositionSize = Number(settledData.positionsize);
    const parsedInitialMargin = Number(settledData.initial_margin);
    const parsedLeverage = Number(settledData.leverage);
    const normalizedPositionType =
      typeof settledData.position_type === "string"
        ? settledData.position_type.toUpperCase()
        : "";

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
      positionSize:
        Number.isFinite(parsedPositionSize) && parsedPositionSize > 0
          ? parsedPositionSize
          : selectedTrade.positionSize,
      positionType:
        normalizedPositionType === "LONG" || normalizedPositionType === "SHORT"
          ? normalizedPositionType
          : selectedTrade.positionType,
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
      initialMargin:
        Number.isFinite(parsedInitialMargin) && parsedInitialMargin > 0
          ? parsedInitialMargin
          : selectedTrade.initialMargin,
      leverage:
        Number.isFinite(parsedLeverage) && parsedLeverage > 0
          ? parsedLeverage
          : selectedTrade.leverage,
      // Prefer the API response when it has already reflected the new SLTP.
      // If it returned null (order not yet processed), fall back to the
      // values we just submitted so the UI reflects them immediately.
      // When tp/sl is undefined the user explicitly cleared that leg — use
      // undefined (not the old value) so the removal persists locally.
      takeProfit:
        settledData.take_profit != null
          ? settledData.take_profit
          : tp != null
            ? { price: String(tp), created_time: new Date().toISOString() }
            : undefined,
      stopLoss:
        settledData.stop_loss != null
          ? settledData.stop_loss
          : sl != null
            ? { price: String(sl), created_time: new Date().toISOString() }
            : undefined,
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
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="min-h-[540px] max-h-[90dvh] md:bottom-auto md:left-[50%] md:right-auto md:top-[50%] md:w-full md:max-w-lg md:translate-x-[-50%] md:translate-y-[-50%] md:rounded-md">
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
              {/* 1. Position Context */}
              <div className="flex flex-col gap-1 rounded border border-outline p-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-primary-accent">
                    Entry Price (USD)
                  </span>
                  <span className="text-xs font-medium">
                    {formatCurrency(entryPrice)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-primary-accent">
                    Mark Price (USD)
                  </span>
                  <span className="text-xs font-medium">
                    {formatCurrency(markPrice)}
                  </span>
                </div>
                {liquidationPrice > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-primary-accent">
                      Liquidation Price (USD)
                    </span>
                    <span className="text-xs font-medium text-red">
                      {formatCurrency(liquidationPrice)}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-primary-accent">
                    Position Size (BTC)
                  </span>
                  <span className="text-xs font-medium">
                    {positionSizeDisplayBtc.toFixed(6)} BTC
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-primary-accent">Side</span>
                  <span
                    className={cn(
                      "text-xs font-medium",
                      isLong ? "text-green-medium" : "text-red"
                    )}
                  >
                    {isLong ? "Long" : "Short"}
                  </span>
                </div>
              </div>

              {/* 2. Limit Price Input */}
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
                  formatDecimals={2}
                />
                {limitPrice > 0 && isFinite(estimatedPnlLimit) && (
                  <p className="mt-0.5 min-h-[1rem] text-xs text-primary-accent">
                    Est. PnL:{" "}
                    <span
                      className={
                        isPnlLimitPositive
                          ? "text-green-medium"
                          : isPnlLimitNegative
                            ? "text-red"
                            : ""
                      }
                    >
                      {isPnlLimitPositive ? "+" : ""}
                      {estimatedPnlLimitBtcStr} BTC
                    </span>
                    {btcPrice > 0 && (
                      <span className="ml-1">
                        ≈{" "}
                        {isPnlLimitPositive
                          ? "+"
                          : isPnlLimitNegative
                            ? "-"
                            : ""}
                        {formatCurrency(Math.abs(estimatedPnlLimitUsdNum))}
                      </span>
                    )}
                  </p>
                )}
              </div>

              {/* 3. Slider */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-primary-accent">
                    Move from entry
                  </span>
                  <span className="text-xs font-medium">
                    {limitDistanceFromEntryPct != null
                      ? `${limitDistanceFromEntryPct >= 0 ? "+" : ""}${limitDistanceFromEntryPct.toFixed(1)}%`
                      : "—"}
                  </span>
                </div>
                <div className="relative pt-5">
                  {/* Floating price chip above the slider thumb */}
                  {limitPrice > 0 && (
                    <div
                      className="absolute top-0 -translate-x-1/2 whitespace-nowrap rounded bg-outline px-1.5 py-0.5 text-[10px] font-medium"
                      style={{ left: `${thumbDisplayPct}%` }}
                    >
                      {formatCurrency(limitPrice)}
                    </div>
                  )}
                  <Slider
                    min={limitSliderRange.min}
                    max={limitSliderRange.max}
                    step={0.1}
                    value={[limitSliderPct]}
                    onValueChange={([pct]) =>
                      setLimitPrice(entryPrice * (1 + pct / 100))
                    }
                  />
                </div>
              </div>

              {/* 4. Preset chips */}
              <div className="space-y-1.5">
                <span className="text-xs text-primary-accent/60">Presets</span>
                <div className="flex items-center gap-1.5">
                  <span className="w-10 shrink-0 text-xs text-primary-accent/60">
                    Profit
                  </span>
                  {limitProfitPresets.map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() =>
                        setLimitPrice(entryPrice * (1 + pct / 100))
                      }
                      className="cursor-pointer rounded border border-green-medium/40 bg-green-medium/10 px-2.5 py-1 text-xs font-medium text-green-medium transition-colors hover:bg-green-medium/20 active:bg-green-medium/30"
                    >
                      {pct > 0 ? "+" : ""}
                      {pct}%
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-10 shrink-0 text-xs text-primary-accent/60">
                    Loss
                  </span>
                  {limitLossPresets.map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() =>
                        setLimitPrice(entryPrice * (1 + pct / 100))
                      }
                      className="cursor-pointer rounded border border-red/40 bg-red/10 px-2.5 py-1 text-xs font-medium text-red transition-colors hover:bg-red/20 active:bg-red/30"
                    >
                      {pct > 0 ? "+" : ""}
                      {pct}%
                    </button>
                  ))}
                </div>
              </div>

              {/* 5. Distance indicator */}
              {limitDistanceFromEntryPct != null && (
                <p className="text-xs text-primary-accent">
                  <span
                    className={
                      isPnlLimitPositive
                        ? "text-green-medium"
                        : isPnlLimitNegative
                          ? "text-red"
                          : ""
                    }
                  >
                    {limitDistanceFromEntryPct >= 0 ? "+" : ""}
                    {limitDistanceFromEntryPct.toFixed(2)}% from entry
                  </span>
                  {markPrice > 0 && limitPrice > 0 && (
                    <span className="ml-1 opacity-60">
                      /{" "}
                      {(((limitPrice - markPrice) / markPrice) * 100).toFixed(
                        2
                      )}
                      % from mark
                    </span>
                  )}
                </p>
              )}

              {/* 6. Visualization bar */}
              {limitEntryBarPct != null && (
                <div className="space-y-1">
                  <span className="text-xs text-primary-accent/60">
                    Price Range
                  </span>
                  <div className="relative pb-5 pt-5">
                    <div className="h-3 w-full overflow-hidden rounded bg-outline">
                      {/* Profit zone: entry → limit (when limit > entry for LONG) */}
                      {limitPriceBarPct != null && isPnlLimitPositive && (
                        <div
                          className="absolute top-0 h-full bg-green-medium/40"
                          style={{
                            left: `${Math.min(limitEntryBarPct, limitPriceBarPct)}%`,
                            width: `${Math.abs(limitPriceBarPct - limitEntryBarPct)}%`,
                          }}
                        />
                      )}
                      {/* Loss zone: limit → entry (when limit < entry for LONG) */}
                      {limitPriceBarPct != null && isPnlLimitNegative && (
                        <div
                          className="absolute top-0 h-full bg-red/40"
                          style={{
                            left: `${Math.min(limitEntryBarPct, limitPriceBarPct)}%`,
                            width: `${Math.abs(limitPriceBarPct - limitEntryBarPct)}%`,
                          }}
                        />
                      )}
                      {/* Entry marker — slightly thicker for emphasis */}
                      <div
                        className="absolute top-0 h-full w-0.5 bg-primary"
                        style={{ left: `${limitEntryBarPct}%` }}
                      />
                      {/* Liq tick */}
                      {limitLiqBarPct != null && (
                        <div
                          className="absolute top-0 h-full w-px bg-red/70"
                          style={{ left: `${limitLiqBarPct}%` }}
                        />
                      )}
                      {/* Mark tick */}
                      {limitMarkBarPct != null && (
                        <div
                          className="absolute top-0 h-full w-0.5"
                          style={{
                            left: `${limitMarkBarPct}%`,
                            backgroundColor: "#60a5fa",
                          }}
                        />
                      )}
                      {/* Limit tick */}
                      {limitPriceBarPct != null && (
                        <div
                          className={cn(
                            "absolute top-0 h-full w-px",
                            isPnlLimitPositive
                              ? "bg-green-medium/80"
                              : isPnlLimitNegative
                                ? "bg-red/80"
                                : "bg-primary-accent/80"
                          )}
                          style={{ left: `${limitPriceBarPct}%` }}
                        />
                      )}
                    </div>
                    {limitPriceBarPct != null && (
                      <PriceBarLabel
                        left={limitPriceBarPct}
                        label={`Limit ${formatCurrency(limitPrice)}`}
                        toneClassName={
                          isPnlLimitPositive
                            ? "text-green-medium"
                            : isPnlLimitNegative
                              ? "text-red"
                              : "text-primary-accent"
                        }
                        position="top"
                      />
                    )}
                    <PriceBarLabel
                      left={limitEntryBarPct}
                      label={`Entry ${formatCurrency(entryPrice)}`}
                      toneClassName="text-primary-accent"
                      position="bottom"
                    />
                    {limitMarkBarPct != null && (
                      <PriceBarLabel
                        left={limitMarkBarPct}
                        label={`Mark ${formatCurrency(markPrice)}`}
                        toneClassName="text-blue-400"
                        position="top"
                      />
                    )}
                    {limitLiqBarPct != null && (
                      <PriceBarLabel
                        left={limitLiqBarPct}
                        label={`Liq ${formatCurrency(liquidationPrice)}`}
                        toneClassName="text-red"
                        position="bottom"
                      />
                    )}
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-1">
                    {limitPrice > 0 && (
                      <div
                        className={cn(
                          "flex items-center gap-1 text-[10px]",
                          isPnlLimitPositive
                            ? "text-green-medium"
                            : isPnlLimitNegative
                              ? "text-red"
                              : "text-primary-accent"
                        )}
                      >
                        <div
                          className={cn(
                            "h-1.5 w-1.5 shrink-0 rounded-full",
                            isPnlLimitPositive
                              ? "bg-green-medium"
                              : isPnlLimitNegative
                                ? "bg-red"
                                : "bg-primary-accent"
                          )}
                        />
                        Limit {formatCurrency(limitPrice)}
                      </div>
                    )}
                    <div className="flex items-center gap-1 text-[10px] text-primary-accent">
                      <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                      Entry {formatCurrency(entryPrice)}
                    </div>
                    {markPrice > 0 && (
                      <div className="text-blue-400 flex items-center gap-1 text-[10px]">
                        <div
                          className="h-1.5 w-1.5 shrink-0 rounded-full"
                          style={{ backgroundColor: "#60a5fa" }}
                        />
                        Mark {formatCurrency(markPrice)}
                      </div>
                    )}
                    {liquidationPrice > 0 && (
                      <div className="flex items-center gap-1 text-[10px] text-red">
                        <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-red" />
                        Liq {formatCurrency(liquidationPrice)}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 7. Inline warnings */}
              {limitMayExecuteImmediately && !limitBeyondLiq && (
                <p className="text-xs text-yellow-500">
                  {isLong
                    ? "This price is at or below the current market price. The order may execute immediately."
                    : "This price is at or above the current market price. The order may execute immediately."}
                </p>
              )}
              {limitBeyondLiq && (
                <p className="text-xs text-yellow-500">
                  Limit price is beyond your liquidation level — the position
                  may be liquidated before this order executes.
                </p>
              )}

              <div className="border-t" />

              {/* 8. Position Amount */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-primary-accent">
                  Position Amount
                </span>
                <span className="text-sm font-medium">${positionSizeUsd}</span>
              </div>

              <Button onClick={handleSettleLimit}>
                {hasLimit ? "Update Limit" : "Confirm"}
              </Button>
            </div>
          </TabsPrimitive.Content>

          {/* ── SL/TP tab ──────────────────────────────────────────────── */}
          <TabsPrimitive.Content value="sltp" className="mt-4">
            <div className="flex flex-col gap-4">
              {/* 1. Position Context */}
              <div className="flex flex-col gap-1 rounded border border-outline p-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-primary-accent">
                    Entry Price (USD)
                  </span>
                  <span className="text-xs font-medium">
                    {formatCurrency(entryPrice)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-primary-accent">
                    Mark Price (USD)
                  </span>
                  <span className="text-xs font-medium">
                    {formatCurrency(markPrice)}
                  </span>
                </div>
                {liquidationPrice > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-primary-accent">
                      Liquidation Price (USD)
                    </span>
                    <span className="text-xs font-medium text-red">
                      {formatCurrency(liquidationPrice)}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-primary-accent">Side</span>
                  <span
                    className={cn(
                      "text-xs font-medium",
                      isLong ? "text-green-medium" : "text-red"
                    )}
                  >
                    {isLong ? "Long" : "Short"}
                  </span>
                </div>
              </div>

              {/* Position Amount + explainer + unit toggle */}
              <div className="flex items-start justify-between gap-2">
                <p className="max-w-[55%] text-xs text-primary-accent/70">
                  SL/TP trigger a market close when the mark price reaches the
                  set level.
                </p>
                <div className="text-right">
                  <span className="block text-[10px] text-primary-accent">
                    Position Amount
                  </span>
                  <span className="text-sm font-medium">
                    ${positionSizeUsd}
                  </span>
                </div>
              </div>

              {/* 2 + 3. Stop Loss | Take Profit — responsive side-by-side grid */}
              <div className="grid grid-cols-1 gap-x-3 gap-y-2 sm:grid-cols-2">
                {/* ── SL column ── */}
                <div className="flex flex-col gap-2">
                  {slEnabled ? (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-red">
                          Stop Loss
                        </span>
                        <button
                          type="button"
                          onClick={() => setSlEnabled(false)}
                          className="text-[10px] text-primary-accent transition-colors hover:text-primary"
                        >
                          Remove
                        </button>
                      </div>
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
                          formatDecimals={2}
                          hideBid
                        />
                        {slPrice > 0 &&
                          isFinite(displaySlPnlBtc) &&
                          displaySlPnlBtc !== 0 &&
                          btcPrice > 0 && (
                            <p className="mt-0.5 text-xs text-primary-accent">
                              PnL ≈{" "}
                              <span
                                className={
                                  displaySlPnlBtc >= 0
                                    ? "text-green-medium"
                                    : "text-red"
                                }
                              >
                                {displaySlPnlBtc > 0 ? "+" : ""}
                                {displaySlPnlBtc.toFixed(8)} BTC
                              </span>
                              <span className="text-primary-accent/70">
                                {" / "}
                                {formatCurrency(displaySlPnlUsd)}
                              </span>
                            </p>
                          )}
                      </div>
                      <div className="space-y-1">
                        <label
                          className="text-xs text-primary-accent"
                          htmlFor="input-sl-pnl"
                        >
                          Target PnL (BTC)
                        </label>
                        <NumberInput
                          id="input-sl-pnl"
                          allowNegative
                          hideBid
                          formatDecimals={8}
                          inputValue={slPnlDisplay}
                          syncWhileFocused={slLastEdited === "price"}
                          setInputValue={handleSlPnlChange}
                          currentPrice={0}
                          placeholder="0.00000000"
                        />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-primary-accent">
                            From mark
                          </span>
                          <span className="text-xs font-medium">
                            {slDistanceFromMarkPct != null
                              ? `${slDistanceFromMarkPct >= 0 ? "+" : ""}${slDistanceFromMarkPct.toFixed(1)}%`
                              : "—"}
                          </span>
                        </div>
                        <Slider
                          min={slSliderRange.min}
                          max={slSliderRange.max}
                          step={0.1}
                          value={[slSliderPct]}
                          onValueChange={([pct]) =>
                            handleSlPriceChange(markPrice * (1 + pct / 100))
                          }
                        />
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {slPresets.map((pct) => (
                          <button
                            key={pct}
                            type="button"
                            onClick={() =>
                              handleSlPriceChange(markPrice * (1 + pct / 100))
                            }
                            className="cursor-pointer rounded border border-red/40 bg-red/10 px-1.5 py-0.5 text-[10px] font-medium text-red transition-colors hover:bg-red/20 active:bg-red/30"
                          >
                            {pct > 0 ? "+" : ""}
                            {pct}%
                          </button>
                        ))}
                      </div>
                      <div className="min-h-[1.25rem]">
                        {validationErrors.sl ? (
                          <p className="text-xs text-red">
                            {validationErrors.sl}
                          </p>
                        ) : slNearLiquidation ? (
                          <p className="text-xs text-yellow-500">
                            SL is near liquidation price.
                          </p>
                        ) : null}
                      </div>
                    </>
                  ) : (
                    <div className="flex min-h-[200px] flex-col items-center justify-center rounded border border-dashed border-outline">
                      <button
                        type="button"
                        onClick={() => setSlEnabled(true)}
                        className="text-xs font-medium text-red transition-colors hover:text-red/80"
                      >
                        + Add Stop Loss
                      </button>
                    </div>
                  )}
                </div>

                {/* ── TP column ── */}
                <div className="flex flex-col gap-2 sm:border-l sm:border-outline sm:pl-3">
                  {tpEnabled ? (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-green-medium">
                          Take Profit
                        </span>
                        <button
                          type="button"
                          onClick={() => setTpEnabled(false)}
                          className="text-[10px] text-primary-accent transition-colors hover:text-primary"
                        >
                          Remove
                        </button>
                      </div>
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
                          formatDecimals={2}
                          hideBid
                        />
                        {tpPrice > 0 &&
                          isFinite(displayTpPnlBtc) &&
                          displayTpPnlBtc !== 0 &&
                          btcPrice > 0 && (
                            <p className="mt-0.5 text-xs text-primary-accent">
                              PnL ≈{" "}
                              <span
                                className={
                                  displayTpPnlBtc >= 0
                                    ? "text-green-medium"
                                    : "text-red"
                                }
                              >
                                {displayTpPnlBtc > 0 ? "+" : ""}
                                {displayTpPnlBtc.toFixed(8)} BTC
                              </span>
                              <span className="text-primary-accent/70">
                                {" / "}
                                {formatCurrency(displayTpPnlUsd)}
                              </span>
                            </p>
                          )}
                      </div>
                      <div className="space-y-1">
                        <label
                          className="text-xs text-primary-accent"
                          htmlFor="input-tp-pnl"
                        >
                          Target PnL (BTC)
                        </label>
                        <NumberInput
                          id="input-tp-pnl"
                          allowNegative
                          hideBid
                          formatDecimals={8}
                          inputValue={tpPnlDisplay}
                          syncWhileFocused={tpLastEdited === "price"}
                          setInputValue={handleTpPnlChange}
                          currentPrice={0}
                          placeholder="0.00000000"
                        />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-primary-accent">
                            From mark
                          </span>
                          <span className="text-xs font-medium">
                            {tpDistanceFromMarkPct != null
                              ? `${tpDistanceFromMarkPct >= 0 ? "+" : ""}${tpDistanceFromMarkPct.toFixed(1)}%`
                              : "—"}
                          </span>
                        </div>
                        <Slider
                          min={tpSliderRange.min}
                          max={tpSliderRange.max}
                          step={0.1}
                          value={[tpSliderPct]}
                          onValueChange={([pct]) =>
                            handleTpPriceChange(markPrice * (1 + pct / 100))
                          }
                        />
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {tpPresets.map((pct) => (
                          <button
                            key={pct}
                            type="button"
                            onClick={() =>
                              handleTpPriceChange(markPrice * (1 + pct / 100))
                            }
                            className="cursor-pointer rounded border border-green-medium/40 bg-green-medium/10 px-1.5 py-0.5 text-[10px] font-medium text-green-medium transition-colors hover:bg-green-medium/20 active:bg-green-medium/30"
                          >
                            {pct > 0 ? "+" : ""}
                            {pct}%
                          </button>
                        ))}
                      </div>
                      <div className="min-h-[1.25rem]">
                        {validationErrors.tp ? (
                          <p className="text-xs text-red">
                            {validationErrors.tp}
                          </p>
                        ) : showTpPoolWarning ? (
                          <p className="text-xs text-yellow-500">
                            TP exceeds 2% of pool equity.
                          </p>
                        ) : null}
                      </div>
                    </>
                  ) : (
                    <div className="flex min-h-[200px] flex-col items-center justify-center rounded border border-dashed border-outline">
                      <button
                        type="button"
                        onClick={() => setTpEnabled(true)}
                        className="text-xs font-medium text-green-medium transition-colors hover:text-green-medium/80"
                      >
                        + Add Take Profit
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* 4. Outcome Visualization Bar */}
              {entryBarPct != null && (
                <div className="space-y-1">
                  <span className="text-xs text-primary-accent/60">
                    Price Range
                  </span>
                  <div className="relative pb-5 pt-5">
                    <div className="h-3 w-full overflow-hidden rounded bg-outline">
                      {/* Red zone: liq → sl */}
                      {liqBarPct != null && slBarPct != null && (
                        <div
                          className="absolute top-0 h-full bg-red/50"
                          style={{
                            left: `${Math.min(liqBarPct, slBarPct)}%`,
                            width: `${Math.abs(slBarPct - liqBarPct)}%`,
                          }}
                        />
                      )}
                      {/* Orange zone: sl → entry */}
                      {slBarPct != null && (
                        <div
                          className="bg-orange-500/40 absolute top-0 h-full"
                          style={{
                            left: `${Math.min(slBarPct, entryBarPct)}%`,
                            width: `${Math.abs(entryBarPct - slBarPct)}%`,
                          }}
                        />
                      )}
                      {/* Green zone: entry → tp */}
                      {tpBarPct != null && (
                        <div
                          className="absolute top-0 h-full bg-green-medium/40"
                          style={{
                            left: `${Math.min(entryBarPct, tpBarPct)}%`,
                            width: `${Math.abs(tpBarPct - entryBarPct)}%`,
                          }}
                        />
                      )}
                      {/* Tick lines */}
                      <div
                        className="absolute top-0 h-full w-0.5 bg-primary"
                        style={{ left: `${entryBarPct}%` }}
                      />
                      {slBarPct != null && (
                        <div
                          className="bg-orange-500/80 absolute top-0 h-full w-px"
                          style={{ left: `${slBarPct}%` }}
                        />
                      )}
                      {tpBarPct != null && (
                        <div
                          className="absolute top-0 h-full w-px bg-green-medium/80"
                          style={{ left: `${tpBarPct}%` }}
                        />
                      )}
                      {liqBarPct != null && (
                        <div
                          className="absolute top-0 h-full w-px bg-red/70"
                          style={{ left: `${liqBarPct}%` }}
                        />
                      )}
                      {markBarPct != null && (
                        <div
                          className="absolute top-0 h-full w-0.5"
                          style={{
                            left: `${markBarPct}%`,
                            backgroundColor: "#60a5fa",
                          }}
                        />
                      )}
                    </div>
                    {slBarPct != null && (
                      <PriceBarLabel
                        left={slBarPct}
                        label={`SL ${formatCurrency(slPrice)}`}
                        toneClassName="text-orange-500"
                        position="top"
                      />
                    )}
                    <PriceBarLabel
                      left={entryBarPct}
                      label={`Entry ${formatCurrency(entryPrice)}`}
                      toneClassName="text-primary-accent"
                      position="bottom"
                    />
                    {markBarPct != null && (
                      <PriceBarLabel
                        left={markBarPct}
                        label={`Mark ${formatCurrency(markPrice)}`}
                        toneClassName="text-blue-400"
                        position="top"
                      />
                    )}
                    {tpBarPct != null && (
                      <PriceBarLabel
                        left={tpBarPct}
                        label={`TP ${formatCurrency(tpPrice)}`}
                        toneClassName="text-green-medium"
                        position="bottom"
                      />
                    )}
                    {liqBarPct != null && (
                      <PriceBarLabel
                        left={liqBarPct}
                        label={`Liq ${formatCurrency(liquidationPrice)}`}
                        toneClassName="text-red"
                        position="bottom"
                      />
                    )}
                  </div>
                </div>
              )}

              {/* 5. Risk / Reward Summary */}
              {hasRR && (
                <div className="space-y-1">
                  <span className="text-xs text-primary-accent/60">
                    Risk / Reward
                  </span>
                  <div className="space-y-1 rounded border border-outline p-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-primary-accent">
                        SL PnL
                      </span>
                      <span
                        className={cn(
                          "text-xs font-medium",
                          displaySlPnlBtc >= 0
                            ? "text-green-medium"
                            : "text-red"
                        )}
                      >
                        {displaySlPnlBtc > 0 ? "+" : ""}
                        {displaySlPnlBtc.toFixed(8)} BTC /{" "}
                        {formatCurrency(displaySlPnlUsd)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-primary-accent">
                        TP PnL
                      </span>
                      <span
                        className={cn(
                          "text-xs font-medium",
                          displayTpPnlBtc >= 0
                            ? "text-green-medium"
                            : "text-red"
                        )}
                      >
                        {displayTpPnlBtc > 0 ? "+" : ""}
                        {displayTpPnlBtc.toFixed(8)} BTC /{" "}
                        {formatCurrency(displayTpPnlUsd)}
                      </span>
                    </div>
                    {rrRatio != null && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-primary-accent">
                          Risk : Reward
                        </span>
                        <span className="text-xs font-medium">
                          1 : {rrRatio.toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Global error */}
              <div className="min-h-[1.25rem]">
                {validationErrors.global && (
                  <p className="text-xs text-red">{validationErrors.global}</p>
                )}
              </div>

              {hasSltp && (
                <p className="text-xs text-primary-accent">
                  {isNoChange
                    ? "Change the values to update your SL/TP."
                    : "You already have an active SL/TP — confirming will update it."}
                </p>
              )}

              <div className="border-t" />

              <Button
                onClick={handleSettleSltp}
                disabled={
                  (!slEnabled && !tpEnabled) ||
                  (hasUserInput && hasBlockingError) ||
                  isNoChange
                }
              >
                {hasSltp ? "Update SL/TP" : "Confirm"}
              </Button>
            </div>
          </TabsPrimitive.Content>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

export default ConditionalCloseDialog;
