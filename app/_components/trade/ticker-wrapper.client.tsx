"use client";
import Image from "next/image";
import React from "react";

import { Separator } from "@/components/seperator";
import TickerItem from "./ticker/ticker-item.client";
import { Zap } from "lucide-react";
import { usePriceFeed } from "@/lib/providers/feed";
import cn from "@/lib/cn";
import { formatCurrency } from "@/lib/twilight/ticker";
import usePriceTickerData from "@/lib/hooks/usePriceTickerData";
import Resource from "@/components/resource";
import Skeleton from "@/components/skeleton";

type Props = {
  btcPrice: number;
};

const TickerWrapper = ({ btcPrice }: Props) => {
  const { feed, currentPrice } = usePriceFeed();

  const priceDelta = feed[feed.length - 2]
    ? currentPrice - feed[feed.length - 2].params.result[0]
    : 0;

  const { high, low, change, turnover } = usePriceTickerData(
    currentPrice || btcPrice
  );

  return (
    <div className="hidden px-4 py-2 lg:flex">
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
        <p
          className={cn(
            priceDelta > 0 ? "text-green-medium" : "text-red",
            priceDelta === 0 && "text-primary",
            "mx-4 text-2xl font-semibold tracking-tighter transition-colors"
          )}
        >
          {currentPrice
            ? formatCurrency(currentPrice)
            : formatCurrency(btcPrice)}
        </p>
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
          isLoaded={change !== 0}
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
          isLoaded={high !== 0}
          placeholder={<Skeleton className="h-6 w-full" />}
        >
          {formatCurrency(high)}
        </Resource>
      </TickerItem>
      <TickerItem className="min-w-[90px]" title="24H Low">
        <Resource
          isLoaded={low !== 0}
          placeholder={<Skeleton className="h-6 w-full" />}
        >
          {formatCurrency(low)}
        </Resource>
      </TickerItem>
      <TickerItem title="24H Turnover">
        <Resource
          isLoaded={turnover !== 0}
          placeholder={<Skeleton className="h-6 w-full" />}
        >
          {formatCurrency(turnover)}
        </Resource>
      </TickerItem>
      <TickerItem border={false} title="Funding Rate / Countdown">
        <Skeleton className="h-6 w-full" />
        {/* <p className="flex">
          <span className="mr-2 inline-flex items-center text-theme">
            <Zap className="w-4" />
          </span>
          <span className="mr-3 text-green-medium">{`0.01100%`}</span>
          {`/ 02:26:01`}
        </p> */}
      </TickerItem>
    </div>
  );
};

export default TickerWrapper;
