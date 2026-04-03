"use client";
import Image from "next/image";
import React, { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Separator } from "@/components/seperator";
import TickerItem from "./ticker/ticker-item.client";
import { usePriceFeed } from "@/lib/providers/feed";
import cn from "@/lib/cn";
import { formatCurrency } from "@/lib/twilight/ticker";
import usePriceTickerData from "@/lib/hooks/usePriceTickerData";
import useGetMarketStats from "@/lib/hooks/useGetMarketStats";
import Resource from "@/components/resource";
import Skeleton from "@/components/skeleton";
import { useSessionStore } from "@/lib/providers/session";
import dayjs from "dayjs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/popover";
import { ExternalLink, Info } from "lucide-react";

const FUNDING_ESTIMATE_PSI = 1;

function getEstimatedFundingRate(totalLong: number, totalShort: number, psi = FUNDING_ESTIMATE_PSI) {
  const allPositionSize = totalLong + totalShort;
  if (!Number.isFinite(allPositionSize) || allPositionSize <= 0 || psi <= 0) {
    return 0;
  }

  const imbalance = (totalLong - totalShort) / allPositionSize;
  if (imbalance === 0) return 0;

  const magnitude = (imbalance * imbalance) / (psi * 8.0);
  return imbalance > 0 ? magnitude : -magnitude;
}

const TickerWrapper = () => {
  const { getCurrentPrice, subscribe } = usePriceFeed();
  const currentPrice = useSyncExternalStore(subscribe, getCurrentPrice, () => 0);
  const btcPrice = useSessionStore((state) => state.price.btcPrice);

  const priceDelta = 0;

  const finalPrice = currentPrice || btcPrice;

  const {
    priceTickerData,
    fundingTickerData,
    openInterestData,
    skewData,
    resetFunding,
    hasPriceStats,
    hasFundingData,
    hasMarketStats,
  } = usePriceTickerData(finalPrice);

  const marketStats = useGetMarketStats();

  const { high, low, change, turnover } = priceTickerData;
  const { openInterest, openInterestBtc } = openInterestData;
  const { longPercent, shortPercent } = skewData;

  const { rate: fundingRate, timestamp: fundingTimestamp } = fundingTickerData;

  const [oiShowBtc, setOiShowBtc] = useState(false);
  const [countdownString, setCountdownString] = useState("00:00:00");
  const hasResetRef = useRef(false);

  const formattedTurnover =
    turnover >= 1_000_000
      ? formatCurrency(turnover, "short")
      : formatCurrency(turnover);

  const estimatedFundingRate = useMemo(() => {
    if (!marketStats.data) return 0;
    return getEstimatedFundingRate(
      marketStats.data.total_long_btc,
      marketStats.data.total_short_btc
    );
  }, [marketStats.data]);

  const fundingImbalancePercent = useMemo(() => {
    if (!marketStats.data) return 0;
    const totalLong = marketStats.data.total_long_btc;
    const totalShort = marketStats.data.total_short_btc;
    const allPositionSize = totalLong + totalShort;
    if (!Number.isFinite(allPositionSize) || allPositionSize <= 0) return 0;
    return Math.abs(((totalLong - totalShort) / allPositionSize) * 100);
  }, [marketStats.data]);

  const estimatedFundingRateLabel = useMemo(() => {
    const estimatedFundingRatePercent = estimatedFundingRate / 100;
    return `${estimatedFundingRatePercent >= 0 ? "+" : ""}${estimatedFundingRatePercent.toFixed(5)}%`;
  }, [estimatedFundingRate]);

  const fundingDirectionLabel = useMemo(() => {
    if (estimatedFundingRate > 0) return "Longs pay shorts";
    if (estimatedFundingRate < 0) return "Shorts pay longs";
    return "Balanced book";
  }, [estimatedFundingRate]);

  const fundingDetailContent = (
    <div className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.08em] text-primary/45">
            Applied
          </p>
          <p
            className={cn(
              "mt-1 text-sm font-semibold tabular-nums",
              parseFloat(fundingRate || "0") === 0
                ? "text-primary"
                : parseFloat(fundingRate || "0") > 0
                  ? "text-green-medium"
                  : "text-red"
            )}
          >
            {fundingRate ? `${fundingRate}%` : "--"}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[11px] uppercase tracking-[0.08em] text-primary/45">
            Next Checkpoint
          </p>
          <p className="mt-1 text-sm font-medium tabular-nums text-primary/72">
            {countdownString}
          </p>
        </div>
      </div>

      <div className="rounded-md border border-outline/70 bg-primary/[0.03] px-3 py-2.5">
        <p className="text-[11px] uppercase tracking-[0.08em] text-primary/45">
          Estimated Next
        </p>
        <p
          className={cn(
            "mt-1 text-base font-semibold tabular-nums",
            estimatedFundingRate === 0
              ? "text-primary"
              : estimatedFundingRate > 0
                ? "text-green-medium"
                : "text-red"
          )}
        >
          {estimatedFundingRateLabel}
        </p>
        <p className="mt-1 text-xs text-primary/60">{fundingDirectionLabel}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-[11px] uppercase tracking-[0.08em] text-primary/45">
            Long Share
          </p>
          <p className="mt-1 font-medium tabular-nums text-green-medium">
            {longPercent.toFixed(0)}%
          </p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.08em] text-primary/45">
            Short Share
          </p>
          <p className="mt-1 font-medium tabular-nums text-red">
            {shortPercent.toFixed(0)}%
          </p>
        </div>
      </div>

      <div>
        <p className="text-[11px] uppercase tracking-[0.08em] text-primary/45">
          Current Imbalance
        </p>
        <p className="mt-1 text-sm font-medium tabular-nums text-primary/80">
          {fundingImbalancePercent.toFixed(2)}%
        </p>
      </div>

      <p className="text-xs leading-relaxed text-primary/55">
        Estimate uses the current long/short position imbalance and can change
        before the next funding checkpoint. Because the formula squares the
        imbalance, funding can move more sharply once the book drifts away from
        balance.
      </p>
    </div>
  );

  useEffect(() => {
    if (!fundingTimestamp) return;
    hasResetRef.current = false;

    const timer = setInterval(() => {
      const now = dayjs();
      const fundingTime = dayjs(fundingTimestamp);

      let nextFunding = fundingTime.add(1, "hour");
      const expired = nextFunding.diff(now, "ms") <= 0;

      if (expired && !hasResetRef.current) {
        hasResetRef.current = true;
        resetFunding();
      }

      while (nextFunding.diff(now, "ms") <= 0) {
        nextFunding = nextFunding.add(1, "hour");
      }

      const fundingTimeDelta = nextFunding.diff(now, "ms");
      const hours = Math.floor((fundingTimeDelta / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((fundingTimeDelta / 1000 / 60) % 60);
      const seconds = Math.floor((fundingTimeDelta / 1000) % 60);

      setCountdownString(
        `${hours.toString().padStart(2, "0")}:${minutes
          .toString()
          .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
      );
    }, 1000);

    return () => clearInterval(timer);
  }, [fundingTimestamp, resetFunding]);

  return (
    <>
    {/* Mobile ticker */}
    <div className="flex flex-col gap-2 px-3 py-2 lg:hidden">
      <div className="flex items-center gap-2">
        <Image
          width={24}
          height={24}
          src={"/images/btc-icon.png"}
          alt={"bitcoin-icon"}
        />
        <Resource
          isLoaded={finalPrice !== 0}
          placeholder={<Skeleton className="h-5 w-[80px]" />}
        >
          <span className="text-sm font-semibold tabular-nums">
            {currentPrice ? formatCurrency(currentPrice) : formatCurrency(btcPrice)}
          </span>
        </Resource>
        <Resource
          isLoaded={finalPrice !== 0 && hasPriceStats}
          placeholder={<Skeleton className="h-4 w-[40px]" />}
        >
          <span
            className={cn(
              "text-xs font-medium",
              change === 0 && "text-primary",
              change > 0 ? "text-green-medium" : "text-red"
            )}
          >
            {change === 0
              ? `${change.toFixed(2)}%`
              : change > 0
                ? `+${change.toFixed(2)}%`
                : `${change.toFixed(2)}%`}
          </span>
        </Resource>
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-2 md:gap-x-5">
        <div className="min-w-0">
          <Dialog>
            <DialogTrigger asChild>
              <button
                type="button"
                className="flex w-full min-w-0 flex-col items-start rounded-md text-left transition-colors hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40"
                aria-label="Open funding rate details"
              >
                <div className="flex w-full items-center justify-between gap-2">
                  <p className="text-[11px] leading-none text-primary-accent/70">
                    Funding Rate
                  </p>
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-[0.08em] text-primary-accent/45">
                    Est.
                    <Info className="h-3 w-3" />
                  </span>
                </div>
                <p className="mt-1 text-[10px] leading-none text-primary-accent/45">
                  Tap for estimate
                </p>
                <Resource
                  isLoaded={hasFundingData}
                  placeholder={<Skeleton className="mt-1.5 h-4 w-[120px]" />}
                >
                  <div className="mt-1.5 flex min-w-0 items-center gap-1 whitespace-nowrap">
                    <span
                      className={cn(
                        "text-[13px] font-semibold leading-none tabular-nums",
                        parseFloat(fundingRate) === 0
                          ? "text-primary"
                          : parseFloat(fundingRate) > 0
                            ? "text-green-medium"
                            : "text-red"
                      )}
                    >
                      {fundingRate}%
                    </span>
                    <span className="text-primary-accent/55">·</span>
                    <span className="text-[11px] font-normal leading-none tabular-nums text-primary-accent/60">
                      {countdownString}
                    </span>
                  </div>
                </Resource>
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-[calc(100vw-2rem)] md:max-w-sm">
              <DialogTitle>Funding Rate</DialogTitle>
              <DialogDescription className="text-primary/60">
                Current applied funding and an estimate for the next checkpoint.
              </DialogDescription>
              {fundingDetailContent}
            </DialogContent>
          </Dialog>
        </div>

        <div className="min-w-0">
          <p className="text-[11px] leading-none text-primary-accent/70">
            Open Interest
          </p>
          <Resource
            isLoaded={hasMarketStats && finalPrice !== 0}
            placeholder={<Skeleton className="mt-1 h-4 w-[88px]" />}
          >
            <span className="mt-1 inline-block whitespace-nowrap text-[13px] font-medium leading-none tabular-nums text-primary">
              {oiShowBtc
                ? `${openInterestBtc.toFixed(4)} BTC`
                : formatCurrency(openInterest, "short")}
            </span>
          </Resource>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-x-2.5 gap-y-2 border-t border-outline/60 pt-2 md:gap-x-4">
        <div className="min-w-0">
          <p className="text-[10px] leading-none text-primary-accent/70">
            24H High
          </p>
          <Resource
            isLoaded={hasPriceStats}
            placeholder={<Skeleton className="mt-1 h-4 w-[68px]" />}
          >
            <span className="mt-1 inline-block whitespace-nowrap text-[12px] font-medium leading-none tabular-nums text-primary">
              {formatCurrency(high)}
            </span>
          </Resource>
        </div>

        <div className="min-w-0">
          <p className="text-[10px] leading-none text-primary-accent/70">
            24H Low
          </p>
          <Resource
            isLoaded={hasPriceStats}
            placeholder={<Skeleton className="mt-1 h-4 w-[68px]" />}
          >
            <span className="mt-1 inline-block whitespace-nowrap text-[12px] font-medium leading-none tabular-nums text-primary">
              {formatCurrency(low)}
            </span>
          </Resource>
        </div>

        <div className="min-w-0">
          <p className="text-[10px] leading-none text-primary-accent/70">
            Turnover
          </p>
          <Resource
            isLoaded={hasPriceStats}
            placeholder={<Skeleton className="mt-1 h-4 w-[60px]" />}
          >
            <span
              className={cn(
                "mt-1 inline-block whitespace-nowrap text-[12px] font-medium leading-none tabular-nums",
                turnover === 0 ? "text-primary/32" : "text-primary"
              )}
            >
              {formattedTurnover}
            </span>
          </Resource>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-2 pt-1 md:gap-x-4">
        <div className="min-w-0">
          <p className="text-[10px] leading-none text-primary-accent/70">
            Max Order Size
          </p>
          <Resource
            isLoaded={!!marketStats.data}
            placeholder={<Skeleton className="mt-1 h-4 w-[80px]" />}
          >
            {(() => {
              const longSats = marketStats.data?.max_long_btc ?? 0;
              const shortSats = marketStats.data?.max_short_btc ?? 0;
              const longBtc = longSats / 1e8;
              const shortBtc = shortSats / 1e8;
              const useMBTC =
                (longBtc > 0 && longBtc < 0.1) ||
                (shortBtc > 0 && shortBtc < 0.1);
              const denom = useMBTC ? "mBTC" : "BTC";
              const divisor = useMBTC ? 1e5 : 1e8;
              return (
                <div className="mt-1 flex min-w-0 flex-col gap-0.5">
                  <span className="inline-flex items-baseline gap-0.5 whitespace-nowrap text-[12px] font-medium leading-none tabular-nums text-primary">
                    <span className="text-green-medium">
                      {(longSats / divisor).toFixed(2)}
                    </span>
                    <span className="text-primary-accent/75">L</span>
                    <span className="text-primary-accent/50">·</span>
                    <span className="text-red">
                      {(shortSats / divisor).toFixed(2)}
                    </span>
                    <span className="text-primary-accent/75">S</span>
                    <span className="text-primary-accent">{` ${denom}`}</span>
                  </span>
                </div>
              );
            })()}
          </Resource>
        </div>

        <div className="min-w-0">
          <p className="text-[10px] leading-none text-primary-accent/70">
            OI Skew
          </p>
          <Resource
            isLoaded={hasMarketStats}
            placeholder={<Skeleton className="mt-1 h-4 w-[80px]" />}
          >
            <div className="mt-1 flex min-w-0 flex-col gap-1">
              <div className="relative flex h-[4px] w-[88px] overflow-hidden rounded-[1px] md:w-[96px]">
                <div
                  className="bg-green-medium"
                  style={{ width: `${longPercent}%` }}
                />
                <div
                  className="bg-red"
                  style={{ width: `${shortPercent}%` }}
                />
                <div className="pointer-events-none absolute inset-y-[-1px] left-1/2 w-px -translate-x-1/2 bg-background/90" />
              </div>
              <div className="flex items-baseline gap-0.5 text-[10px] font-medium leading-none tabular-nums">
                <span className="text-green-medium">{longPercent.toFixed(0)}</span>
                <span className="text-primary-accent/75">L</span>
                <span className="text-primary-accent/50">·</span>
                <span className="text-red">{shortPercent.toFixed(0)}</span>
                <span className="text-primary-accent/75">S</span>
              </div>
            </div>
          </Resource>
        </div>
      </div>
    </div>

    {/* Desktop ticker */}
    <div className="hidden items-stretch px-1.5 py-2.5 lg:flex xl:px-3 xl:py-3 2xl:px-4 3xl:px-5">
      {/* bitcoin ticker */}
      <div className="flex shrink-0 items-center">
        <div className="flex min-w-0 items-center gap-1.5 pr-2 xl:gap-2 xl:pr-3 2xl:pr-4 3xl:pr-4">
          <Image
            width={24}
            height={24}
            className="opacity-80"
            src={"/images/btc-icon.png"}
            alt={"bitcoin-icon"}
          />
          <div className="min-w-0 max-w-[68px] xl:max-w-[104px] 2xl:max-w-[116px] 3xl:max-w-[128px]">
            <p className="truncate text-[15px] font-semibold leading-tight text-primary/96 xl:text-[16px] 3xl:text-[17px]">
              Bitcoin
            </p>
            <p className="mt-1 text-[11px] font-medium leading-none text-primary/50">
              <small>BTC</small>
            </p>
          </div>
        </div>
        <Separator
          className="h-[82%] self-center bg-outline opacity-70 xl:h-[85%]"
          orientation="vertical"
        />
      </div>
      <div className="flex shrink-0 items-center">
        {finalPrice === 0 ? (
          <Skeleton className="mx-1 h-[30px] w-[160px] xl:mx-2.5 xl:h-[34px] xl:w-[208px] 2xl:w-[228px] 3xl:w-[244px]" />
        ) : (
          <div className="w-[160px] px-1 xl:w-[208px] xl:px-3 2xl:w-[228px] 2xl:px-4 3xl:w-[244px] 3xl:px-4">
            <div className="mb-1 flex items-center gap-1 text-[9px] font-medium uppercase tracking-[0.04em] text-primary/44 xl:text-[10px] xl:tracking-[0.06em] 3xl:text-[11px]">
              <span className="relative inline-flex h-[5px] w-[5px] shrink-0">
                <span className="absolute inset-0 rounded-full bg-green-medium/25 animate-pulse" />
                <span className="relative h-[5px] w-[5px] rounded-full bg-green-medium/65" />
              </span>
              <span>Mark Price</span>
            </div>
            <p
              className={cn(
                priceDelta > 0 ? "text-green-medium" : "text-red",
                priceDelta === 0 && "text-primary",
                "whitespace-nowrap text-left text-[1.4rem] font-semibold leading-none tracking-tight tabular-nums transition-colors xl:text-[1.95rem] 2xl:text-[2.125rem] 3xl:text-[2.25rem]"
              )}
            >
              {currentPrice
                ? formatCurrency(currentPrice)
                : formatCurrency(btcPrice)}
            </p>
          </div>
        )}

        <Separator
          className="h-[82%] self-center bg-outline opacity-70 xl:h-[85%]"
          orientation="vertical"
        />
      </div>

      <TickerItem
        title="24H Change"
        className={cn(
          "w-[58px] font-semibold xl:w-[68px] 2xl:w-[72px] 3xl:w-[76px]",
          change === 0 && "text-primary",
          change > 0 ? "text-green-medium" : "text-red"
        )}
        itemClassName="shrink-0"
      >
        <Resource
          isLoaded={finalPrice !== 0 && hasPriceStats}
          placeholder={<Skeleton className="h-6 w-[60px]" />}
        >
          {change === 0
            ? change.toFixed(2)
            : change > 0
              ? `+ ${change.toFixed(2)}`
              : `- ${Math.abs(change).toFixed(2)}`}
          {"%"}
        </Resource>
      </TickerItem>

      <TickerItem
        className="w-[88px] xl:w-[104px] 2xl:w-[112px] 3xl:w-[116px]"
        itemClassName="shrink-0"
        title="24H High"
      >
        <Resource
          isLoaded={hasPriceStats}
          placeholder={<Skeleton className="h-6 w-full" />}
        >
          {formatCurrency(high)}
        </Resource>
      </TickerItem>
      <TickerItem
        className="w-[88px] xl:w-[104px] 2xl:w-[112px] 3xl:w-[116px]"
        itemClassName="shrink-0"
        title="24H Low"
      >
        <Resource
          isLoaded={hasPriceStats}
          placeholder={<Skeleton className="h-6 w-full" />}
        >
          {formatCurrency(low)}
        </Resource>
      </TickerItem>
      <TickerItem
        className="w-[76px] xl:w-[96px] 2xl:w-[104px] 3xl:w-[108px]"
        itemClassName="shrink-0"
        title="24H Turnover"
      >
        <Resource
          isLoaded={hasPriceStats}
          placeholder={<Skeleton className="h-6 w-full" />}
        >
          <span className={cn(turnover === 0 && "text-primary/32")}>
            {formattedTurnover}
          </span>
        </Resource>
      </TickerItem>
      <TickerItem
        className="w-[7ch] xl:w-[10ch] 2xl:w-[11ch] 3xl:w-[12ch]"
        itemClassName="shrink-0"
        title="Open Interest"
      >
        <Resource
          isLoaded={hasMarketStats && finalPrice !== 0}
          placeholder={<Skeleton className="h-6 w-full" />}
        >
          <span
            className="inline-grid w-[7ch] cursor-pointer justify-items-start rounded px-1 tabular-nums transition-colors hover:bg-primary/5 hover:text-primary xl:w-[10ch] 2xl:w-[11ch] 3xl:w-[12ch]"
            onClick={() => setOiShowBtc((prev) => !prev)}
            title={oiShowBtc ? "Show open interest in USD" : "Show open interest in BTC"}
          >
            <span
              className={cn(
                "col-start-1 row-start-1",
                oiShowBtc && "invisible"
              )}
            >
              {formatCurrency(openInterest, "short")}
            </span>
            <span
              className={cn(
                "col-start-1 row-start-1",
                !oiShowBtc && "invisible"
              )}
            >
              {openInterestBtc.toFixed(4)} BTC
            </span>
          </span>
        </Resource>
      </TickerItem>
      <TickerItem
        itemClassName="shrink-0 pl-1"
        title="OI Skew"
      >
        <Resource
          isLoaded={hasMarketStats}
          placeholder={<Skeleton className="h-6 w-[72px] xl:w-[96px] 2xl:w-[108px] 3xl:w-[116px]" />}
        >
          <div className="flex min-w-[72px] flex-col gap-0.5 xl:min-w-[104px] 2xl:min-w-[116px] 3xl:min-w-[124px]">
            <div className="relative flex h-[5px] w-[72px] overflow-hidden rounded-[1px] xl:w-[104px] 2xl:w-[116px] 3xl:w-[124px]">
              <div
                className="bg-green-medium"
                style={{ width: `${longPercent}%` }}
              />
              <div className="bg-red" style={{ width: `${shortPercent}%` }} />
              <div className="pointer-events-none absolute inset-y-[-1px] left-1/2 w-px -translate-x-1/2 bg-background/90" />
            </div>
            <div className="flex justify-between text-[9px] leading-none tabular-nums xl:text-[10px] 3xl:text-[11px]">
              <span className="flex items-baseline gap-0.5">
                <span className="text-green-medium/90">{longPercent.toFixed(0)}%</span>
                <span className="text-primary/45">L</span>
              </span>
              <span className="flex items-baseline gap-0.5">
                <span className="text-red/90">{shortPercent.toFixed(0)}%</span>
                <span className="text-primary/45">S</span>
              </span>
            </div>
          </div>
        </Resource>
      </TickerItem>
      <TickerItem
        className="w-[118px] xl:w-[136px] 2xl:w-[148px] 3xl:w-[156px]"
        itemClassName="shrink-0 pl-1"
        title="Max Order Size"
      >
        <Resource
          isLoaded={hasMarketStats}
          placeholder={<Skeleton className="h-6 w-[112px]" />}
        >
          {(() => {
            const longSats = marketStats.data?.max_long_btc ?? 0;
            const shortSats = marketStats.data?.max_short_btc ?? 0;
            const longBtc = longSats / 1e8;
            const shortBtc = shortSats / 1e8;
            const useMBTC =
              (longBtc > 0 && longBtc < 0.1) ||
              (shortBtc > 0 && shortBtc < 0.1);
            const denom = useMBTC ? "mBTC" : "BTC";
            const divisor = useMBTC ? 1e5 : 1e8;

            return (
              <span className="tabular-nums">
                <span className="text-green-medium">{(longSats / divisor).toFixed(2)}</span>
                <span className="text-[11px] text-primary/45">L</span>
                <span className="text-[11px] text-primary/32">{" · "}</span>
                <span className="text-red">{(shortSats / divisor).toFixed(2)}</span>
                <span className="text-[11px] text-primary/45">S</span>
                <span className="text-[11px] text-primary/45">{` ${denom}`}</span>
              </span>
            );
          })()}
        </Resource>
      </TickerItem>
      <TickerItem
        className="flex w-[148px] flex-row items-center xl:w-[170px] 2xl:w-[186px] 3xl:w-[196px]"
        itemClassName="shrink-0 pl-1"
        border={false}
        title={
          <span className="inline-flex items-center gap-1">
            <span>Funding Rate</span>
            <span className="inline-flex items-center gap-0.5 text-[8px] uppercase tracking-[0.08em] text-primary/35">
              Est.
              <Info className="h-[9px] w-[9px]" />
            </span>
          </span>
        }
      >
        <Resource
          isLoaded={hasFundingData}
          placeholder={<Skeleton className="h-6 w-full" />}
        >
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="inline-flex w-full items-center gap-1 whitespace-nowrap rounded px-1 py-0.5 text-left transition-colors hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40"
                title="View funding details"
                aria-label="Open funding rate details"
              >
                {fundingRate ? (
                  <span
                    className={cn(
                      "text-[13px] font-semibold leading-none tabular-nums xl:text-[14px] 2xl:text-[15px] 3xl:text-[15px]",
                      parseFloat(fundingRate) === 0
                        ? "text-primary"
                        : parseFloat(fundingRate) > 0
                          ? "text-green-medium"
                          : "text-red"
                    )}
                  >
                    {`${fundingRate}`}%
                  </span>
                ) : (
                  <span className="text-[13px] font-semibold leading-none tabular-nums text-primary/70 xl:text-[14px] 2xl:text-[15px] 3xl:text-[15px]">
                    {fundingRate}%
                  </span>
                )}

                <span className="text-primary/14">·</span>
                <span className="text-[9px] font-normal leading-none tabular-nums text-primary/60 xl:text-[11px] 2xl:text-[12px] 3xl:text-[12px]">
                  {countdownString}
                </span>
                <ExternalLink className="h-3 w-3 text-primary/35" />
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-[min(100vw-2rem,19rem)]">
              <div className="mb-2">
                <p className="text-sm font-semibold text-primary">Funding Rate</p>
                <p className="mt-1 text-xs leading-relaxed text-primary/60">
                  Current applied funding and an estimate for the next checkpoint.
                </p>
              </div>
              {fundingDetailContent}
            </PopoverContent>
          </Popover>
        </Resource>
      </TickerItem>
    </div>
    </>
  );
};

export default TickerWrapper;
