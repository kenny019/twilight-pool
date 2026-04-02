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
          <p className="text-[11px] leading-none text-primary-accent/70">
            Funding Rate
          </p>
          <Resource
            isLoaded={hasFundingData}
            placeholder={<Skeleton className="mt-1 h-4 w-[120px]" />}
          >
            <div className="mt-1 flex min-w-0 items-center gap-1 whitespace-nowrap">
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
    <div className="hidden items-stretch px-2.5 py-2.5 xl:px-4 xl:py-3 lg:flex">
      {/* bitcoin ticker */}
      <div className="flex shrink-0 items-center">
        <div className="flex min-w-0 items-center gap-1.5 pr-2.5 xl:gap-2 xl:pr-4">
          <Image
            width={24}
            height={24}
            className="opacity-80"
            src={"/images/btc-icon.png"}
            alt={"bitcoin-icon"}
          />
          <div className="min-w-0 max-w-[74px] xl:max-w-[116px]">
            <p className="truncate text-[15px] font-semibold leading-tight text-primary/96 xl:text-[16px]">
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
          <Skeleton className="mx-2.5 h-[30px] w-[176px] xl:mx-3 xl:h-[34px] xl:w-[228px]" />
        ) : (
          <div className="w-[176px] px-2.5 xl:w-[228px] xl:px-4">
            <div className="mb-1 flex items-center gap-1 text-[9px] font-medium uppercase tracking-[0.04em] text-primary/44 xl:text-[10px] xl:tracking-[0.06em]">
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
                "whitespace-nowrap text-left text-[1.625rem] font-semibold leading-none tracking-tight tabular-nums transition-colors xl:text-[2.125rem]"
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
          "font-semibold",
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
        className="w-[104px] xl:w-[112px]"
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
        className="w-[104px] xl:w-[112px]"
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
        className="w-[92px] xl:w-[104px]"
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
        className="w-[9ch] xl:w-[11ch]"
        itemClassName="shrink-0"
        title="Open Interest"
      >
        <Resource
          isLoaded={hasMarketStats && finalPrice !== 0}
          placeholder={<Skeleton className="h-6 w-full" />}
        >
          <span
            className="inline-grid w-[9ch] cursor-pointer justify-items-start rounded px-1 tabular-nums transition-colors hover:bg-primary/5 hover:text-primary xl:w-[11ch]"
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
          placeholder={<Skeleton className="h-6 w-[84px] xl:w-[108px]" />}
        >
          <div className="flex min-w-[84px] flex-col gap-0.5 xl:min-w-[116px]">
            <div className="relative flex h-[5px] w-[84px] overflow-hidden rounded-[1px] xl:w-[116px]">
              <div
                className="bg-green-medium"
                style={{ width: `${longPercent}%` }}
              />
              <div className="bg-red" style={{ width: `${shortPercent}%` }} />
              <div className="pointer-events-none absolute inset-y-[-1px] left-1/2 w-px -translate-x-1/2 bg-background/90" />
            </div>
            <div className="flex justify-between text-[9px] leading-none tabular-nums xl:text-[10px]">
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
        className="w-[136px] xl:w-[148px]"
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
        className="flex w-[154px] flex-row items-center xl:w-[186px]"
        itemClassName="shrink-0 pl-1"
        border={false}
        title="Funding Rate"
      >
        <Resource
          isLoaded={hasFundingData}
          placeholder={<Skeleton className="h-6 w-full" />}
        >
          <div className="inline-flex w-full items-center gap-1 whitespace-nowrap">
            {fundingRate ? (
              <span
                className={cn(
                  "text-[14px] font-semibold leading-none tabular-nums xl:text-[15px]",
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
              <span className="text-[14px] font-semibold leading-none tabular-nums text-primary/70 xl:text-[15px]">
                {fundingRate}%
              </span>
            )}

            <span className="text-primary/14">·</span>
            <span className="text-[11px] font-normal leading-none tabular-nums text-primary/60 xl:text-[12px]">
              {countdownString}
            </span>
          </div>
        </Resource>
      </TickerItem>
    </div>
    </>
  );
};

export default TickerWrapper;
