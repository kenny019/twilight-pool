"use client";
import Image from "next/image";
import React from "react";

import { Separator } from "@/components/seperator";
import TickerItem from "./ticker/ticker-item.client";
import { Zap } from "lucide-react";
import { usePriceFeed } from "@/lib/providers/feed";
import cn from "@/lib/cn";
import { formatCurrency } from "@/lib/twilight/ticker";

type Props = {
  btcPrice: string;
};

const TickerWrapper = ({ btcPrice }: Props) => {
  const { feed } = usePriceFeed();

  const currentPrice =
    feed.length > 0 ? feed[feed.length - 1].params.result[0] : 0;

  const priceDelta = feed[feed.length - 2]
    ? currentPrice - feed[feed.length - 2].params.result[0]
    : 0;

  return (
    <div className="flex px-4 py-2">
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
            "mx-4 min-w-[120px] text-2xl font-semibold tracking-tighter"
          )}
        >
          {currentPrice ? formatCurrency(currentPrice) : btcPrice}
        </p>
        <Separator className="h-[calc(100%-8px)]" orientation="vertical" />
      </div>
      <TickerItem title="24H Change %" className="text-green-medium">
        + 0.46%
      </TickerItem>
      <TickerItem title="24H High">29,559.12</TickerItem>
      <TickerItem title="24H Low">28,660.01</TickerItem>
      <TickerItem title="24H Turnover (BTC)">22,600.26</TickerItem>
      <TickerItem border={false} title="Funding Rate / Countdown">
        <p className="flex">
          <span className="mr-2 inline-flex items-center text-theme">
            <Zap className="w-4" />
          </span>
          <span className="mr-3 text-green-medium">{`0.01100%`}</span>
          {`/ 02:26:01`}
        </p>
      </TickerItem>
    </div>
  );
};

export default TickerWrapper;
