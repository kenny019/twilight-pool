"use client";
import Image from "next/image";
import React, { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Separator } from "@/components/seperator";
import TickerItem from "./ticker/ticker-item.client";
import { ChevronDown, Zap } from "lucide-react";
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
    hasInit,
  } = usePriceTickerData(finalPrice);

  const marketStats = useGetMarketStats();

  const { high, low, change, turnover } = priceTickerData;
  const { openInterest, openInterestBtc } = openInterestData;
  const { longPercent, shortPercent } = skewData;

  const { rate: fundingRate, timestamp: fundingTimestamp } = fundingTickerData;

  const [oiShowBtc, setOiShowBtc] = useState(false);
  const [countdownString, setCountdownString] = useState("00:00:00");
  const [isExpanded, setIsExpanded] = useState(false);
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
    <div className="flex flex-col px-3 py-2 lg:hidden">
      {/* Row 1: icon, price, 24h change, chevron */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Image
            width={24}
            height={24}
            src={"/images/btc-icon.png"}
            alt={"bitcoin-icon"}
          />
          <Resource
            isLoaded={finalPrice !== 0 && hasInit}
            placeholder={<Skeleton className="h-5 w-[80px]" />}
          >
            <span className="text-sm font-semibold">
              {currentPrice
                ? formatCurrency(currentPrice)
                : formatCurrency(btcPrice)}
            </span>
          </Resource>
          <Resource
            isLoaded={finalPrice !== 0 && hasInit}
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
        <button
          onClick={() => setIsExpanded((prev) => !prev)}
          className="flex min-h-[44px] min-w-[44px] items-center justify-center p-2.5 touch-manipulation"
          aria-label={isExpanded ? "Collapse ticker" : "Expand ticker"}
        >
          <ChevronDown
            className={cn(
              "h-4 w-4 transition-transform",
              isExpanded && "rotate-180"
            )}
          />
        </button>
      </div>

      {/* Row 2: funding rate + countdown, open interest */}
      <div className="mt-1 flex items-center justify-between text-xs text-primary-accent">
        <Resource
          isLoaded={hasInit && fundingRate !== "00:00:00"}
          placeholder={<Skeleton className="h-3 w-[120px]" />}
        >
          <div className="flex items-center gap-1">
            <Zap className="h-3 w-3" />
            <span>FR:</span>
            <span
              className={cn(
                parseFloat(fundingRate) === 0
                  ? "text-primary"
                  : parseFloat(fundingRate) > 0
                    ? "text-green-medium"
                    : "text-red"
              )}
            >
              {fundingRate}%
            </span>
            <span className="text-primary-accent/70">·</span>
            <span className="text-primary-accent/75">{countdownString}</span>
          </div>
        </Resource>
        <Resource
          isLoaded={finalPrice !== 0 && hasInit}
          placeholder={<Skeleton className="h-3 w-[80px]" />}
        >
          <span>OI: {formatCurrency(openInterest, "short")}</span>
        </Resource>
      </div>

      {/* Collapsible rows */}
      {isExpanded && (
        <div className="mt-2 space-y-1.5 border-t pt-2 text-xs">
          {/* Row 3: 24H High / Low */}
          <div className="flex justify-between">
            <Resource
              isLoaded={finalPrice !== 0 && hasInit}
              placeholder={<Skeleton className="h-3 w-[100px]" />}
            >
              <span className="text-primary-accent">24H High: <span className="text-primary">{formatCurrency(high)}</span></span>
            </Resource>
            <Resource
              isLoaded={finalPrice !== 0 && hasInit}
              placeholder={<Skeleton className="h-3 w-[100px]" />}
            >
              <span className="text-primary-accent">24H Low: <span className="text-primary">{formatCurrency(low)}</span></span>
            </Resource>
          </div>

          {/* Row 4: Turnover / Skew */}
          <div className="flex items-center justify-between">
            <Resource
              isLoaded={finalPrice !== 0 && hasInit}
              placeholder={<Skeleton className="h-3 w-[100px]" />}
            >
              <span className="text-primary-accent">Turnover: <span className="text-primary">{formatCurrency(turnover)}</span></span>
            </Resource>
            <Resource
              isLoaded={hasInit}
              placeholder={<Skeleton className="h-3 w-[100px]" />}
            >
              <div className="flex items-center gap-1.5">
                <span className="text-primary-accent">OI Skew:</span>
                <div className="flex h-1.5 w-[60px] overflow-hidden rounded-sm">
                  <div className="bg-green-medium" style={{ width: `${longPercent}%` }} />
                  <div className="bg-red" style={{ width: `${shortPercent}%` }} />
                </div>
                <span>
                  <span className="text-green-medium">{longPercent.toFixed(0)}%L</span>
                  <span className="text-primary-accent">/</span>
                  <span className="text-red">{shortPercent.toFixed(0)}%S</span>
                </span>
              </div>
            </Resource>
          </div>

          {/* Row 5: Max Long / Short */}
          <div className="flex justify-between">
            <Resource
              isLoaded={!!marketStats.data}
              placeholder={<Skeleton className="h-3 w-[160px]" />}
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
                  <span className="text-primary-accent">
                    Max Order Size:{" "}
                    <span className="text-green-medium">L {(longSats / divisor).toFixed(2)}</span>
                    <span className="text-primary-accent/70"> · </span>
                    <span className="text-red">S {(shortSats / divisor).toFixed(2)}</span>
                    <span className="text-primary-accent"> {denom}</span>
                  </span>
                );
              })()}
            </Resource>
          </div>
        </div>
      )}
    </div>

    {/* Desktop ticker */}
    <div className="hidden items-stretch px-3 py-3 xl:px-4 lg:flex">
      {/* bitcoin ticker */}
      <div className="flex shrink-0 items-center">
        <div className="flex min-w-0 items-center gap-2 pr-3 xl:pr-4">
          <Image
            width={26}
            height={26}
            className="opacity-80"
            src={"/images/btc-icon.png"}
            alt={"bitcoin-icon"}
          />
          <div className="min-w-0 max-w-[88px] xl:max-w-[116px]">
            <p className="truncate text-[16px] font-semibold leading-tight text-primary/96">
              Bitcoin
            </p>
            <p className="mt-1 text-[11px] font-medium leading-none text-primary/50">
              <small>BTC</small>
            </p>
          </div>
        </div>
        <Separator
          className="h-[85%] self-center bg-outline opacity-70"
          orientation="vertical"
        />
      </div>
      <div className="flex shrink-0 items-center">
        {!hasInit ? (
          <Skeleton className="mx-3 h-[34px] w-[212px] xl:w-[228px]" />
        ) : (
          <div className="w-[212px] px-3 xl:w-[228px] xl:px-4">
            <div className="mb-1 flex items-center gap-1 text-[10px] font-medium uppercase tracking-[0.06em] text-primary/44">
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
                "whitespace-nowrap text-left text-[2rem] font-semibold leading-none tracking-tight tabular-nums transition-colors xl:text-[2.125rem]"
              )}
            >
              {currentPrice
                ? formatCurrency(currentPrice)
                : formatCurrency(btcPrice)}
            </p>
          </div>
        )}

        <Separator
          className="h-[85%] self-center bg-outline opacity-70"
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
          isLoaded={finalPrice !== 0 && hasInit}
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
        className="min-w-[86px]"
        itemClassName="min-w-0"
        title="24H High"
      >
        <Resource
          isLoaded={finalPrice !== 0 && hasInit}
          placeholder={<Skeleton className="h-6 w-full" />}
        >
          {formatCurrency(high)}
        </Resource>
      </TickerItem>
      <TickerItem
        className="min-w-[86px]"
        itemClassName="min-w-0"
        title="24H Low"
      >
        <Resource
          isLoaded={finalPrice !== 0 && hasInit}
          placeholder={<Skeleton className="h-6 w-full" />}
        >
          {formatCurrency(low)}
        </Resource>
      </TickerItem>
      <TickerItem
        className="min-w-[68px]"
        itemClassName="min-w-0"
        title="24H Turnover"
      >
        <Resource
          isLoaded={finalPrice !== 0 && hasInit}
          placeholder={<Skeleton className="h-6 w-full" />}
        >
          <span className={cn(turnover === 0 && "text-primary/32")}>
            {formattedTurnover}
          </span>
        </Resource>
      </TickerItem>
      <TickerItem
        className="min-w-[11ch]"
        itemClassName="min-w-0"
        title="Open Interest"
      >
        <Resource
          isLoaded={finalPrice !== 0 && hasInit}
          placeholder={<Skeleton className="h-6 w-full" />}
        >
          <span
            className="inline-grid w-[11ch] cursor-pointer justify-items-start rounded px-1 tabular-nums transition-colors hover:bg-primary/5 hover:text-primary"
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
          isLoaded={hasInit}
          placeholder={<Skeleton className="h-6 w-[96px] xl:w-[108px]" />}
        >
          <div className="flex min-w-[104px] flex-col gap-0.5 xl:min-w-[116px]">
            <div className="relative flex h-[5px] w-[104px] overflow-hidden rounded-[1px] xl:w-[116px]">
              <div
                className="bg-green-medium"
                style={{ width: `${longPercent}%` }}
              />
              <div className="bg-red" style={{ width: `${shortPercent}%` }} />
              <div className="pointer-events-none absolute inset-y-[-1px] left-1/2 w-px -translate-x-1/2 bg-background/90" />
            </div>
            <div className="flex justify-between text-[10px] leading-none tabular-nums">
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
        className="min-w-[132px]"
        itemClassName="min-w-0 pl-1"
        title="Max Order Size"
      >
        <Resource
          isLoaded={!!marketStats.data}
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
        className="flex flex-row items-center"
        itemClassName="shrink-0 pl-1"
        border={false}
        title="Funding Rate"
      >
        <Resource
          isLoaded={hasInit && fundingRate !== "00:00:00"}
          placeholder={<Skeleton className="h-6 w-full" />}
        >
          <div className="inline-flex min-w-[172px] items-center gap-1 whitespace-nowrap">
            {fundingRate ? (
              <span
                className={cn(
                  "text-[15px] font-semibold leading-none tabular-nums",
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
              <span className="text-[15px] font-semibold leading-none tabular-nums text-primary/70">
                {fundingRate}%
              </span>
            )}

            <span className="text-primary/14">·</span>
            <span className="text-[12px] font-normal leading-none tabular-nums text-primary/60">
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
