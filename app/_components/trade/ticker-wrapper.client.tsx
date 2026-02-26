"use client";
import Image from "next/image";
import React, { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Separator } from "@/components/seperator";
import TickerItem from "./ticker/ticker-item.client";
import { Zap } from "lucide-react";
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
  const hasResetRef = useRef(false);

  function useFundingCountdown() {
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
  }

  useFundingCountdown();

  return (
    <div className="hidden space-x-2 px-4 py-2 lg:flex">
      {/* bitcoin ticker */}
      <div className="flex items-center">
        <div className="flex items-center space-x-2 pr-4">
          <Image
            width={32}
            height={32}
            src={"/images/btc-icon.png"}
            alt={"bitcoin-icon"}
          />
          <div className="flex flex-col justify-between">
            <p>Bitcoin</p>
            <p className="text-sm dark:text-gray-500">
              <small>BTC</small>
            </p>
          </div>
        </div>
        <Separator className="h-[calc(100%-8px)]" orientation="vertical" />
      </div>
      <div className="flex items-center">
        {!hasInit ? (
          <Skeleton className="mr-2 h-[32px] w-[120px]" />
        ) : (
          <p
            className={cn(
              priceDelta > 0 ? "text-green-medium" : "text-red",
              priceDelta === 0 && "text-primary",
              "w-[140px] pr-2 text-center text-2xl font-semibold tracking-tighter transition-colors"
            )}
          >
            {currentPrice
              ? formatCurrency(currentPrice)
              : formatCurrency(btcPrice)}
          </p>
        )}

        <Separator className="h-[calc(100%-8px)]" orientation="vertical" />
      </div>

      <TickerItem
        title="24H Change %"
        className={cn(
          change === 0 && "text-primary",
          change > 0 ? "text-green-medium" : "text-red"
        )}
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

      <TickerItem className="min-w-[90px]" title="24H High">
        <Resource
          isLoaded={finalPrice !== 0 && hasInit}
          placeholder={<Skeleton className="h-6 w-full" />}
        >
          {formatCurrency(high)}
        </Resource>
      </TickerItem>
      <TickerItem className="min-w-[90px]" title="24H Low">
        <Resource
          isLoaded={finalPrice !== 0 && hasInit}
          placeholder={<Skeleton className="h-6 w-full" />}
        >
          {formatCurrency(low)}
        </Resource>
      </TickerItem>
      <TickerItem title="24H Turnover">
        <Resource
          isLoaded={finalPrice !== 0 && hasInit}
          placeholder={<Skeleton className="h-6 w-full" />}
        >
          {formatCurrency(turnover)}
        </Resource>
      </TickerItem>
      <TickerItem title={oiShowBtc ? "Open Interest (BTC)" : "Open Interest (USD)"}>
        <Resource
          isLoaded={finalPrice !== 0 && hasInit}
          placeholder={<Skeleton className="h-6 w-full" />}
        >
          <span
            className="inline-grid cursor-pointer"
            onClick={() => setOiShowBtc((prev) => !prev)}
          >
            <span className={cn("col-start-1 row-start-1", oiShowBtc && "invisible")}>
              {formatCurrency(openInterest, "short")}
            </span>
            <span className={cn("col-start-1 row-start-1", !oiShowBtc && "invisible")}>
              {openInterestBtc.toFixed(4)} BTC
            </span>
          </span>
        </Resource>
      </TickerItem>
      <TickerItem title="Skew">
        <Resource
          isLoaded={hasInit}
          placeholder={<Skeleton className="h-6 w-[108px]" />}
        >
          <div className="flex flex-col gap-0.5">
            <div className="flex h-2 w-[108px] overflow-hidden rounded-sm">
              <div
                className="bg-green-medium"
                style={{ width: `${longPercent}%` }}
              />
              <div className="bg-red" style={{ width: `${shortPercent}%` }} />
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-green-medium">
                {longPercent.toFixed(0)}% L
              </span>
              <span className="text-red">{shortPercent.toFixed(0)}% S</span>
            </div>
          </div>
        </Resource>
      </TickerItem>
      <TickerItem title="Max Long / Short">
        <Resource
          isLoaded={!!marketStats.data}
          placeholder={<Skeleton className="h-6 w-[80px]" />}
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
              <span>
                <span className="text-green-medium">
                  {(longSats / divisor).toFixed(2)}
                </span>
                <span className="text-xs text-gray-500">{" / "}</span>
                <span className="text-red">
                  {(shortSats / divisor).toFixed(2)}
                </span>
                <span className="text-xs text-gray-500">{` ${denom}`}</span>
              </span>
            );
          })()}
        </Resource>
      </TickerItem>
      <TickerItem
        className="flex flex-row items-center"
        border={false}
        title="Funding Rate / Countdown"
      >
        <Resource
          isLoaded={hasInit && fundingRate !== "00:00:00"}
          placeholder={<Skeleton className="h-6 w-full" />}
        >
          <div className="mr-2 inline-flex items-center space-x-2 text-theme">
            <Zap className="w-4" />

            {fundingRate ? (
              <span
                className={cn(
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
              <span>{fundingRate}%</span>
            )}

            <span>{`/ ${countdownString}`}</span>
          </div>
        </Resource>
      </TickerItem>
    </div>
  );
};

export default TickerWrapper;
