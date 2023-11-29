import Image from "next/image";
import React from "react";

import { Separator } from "@/components/seperator";
import TickerItem from "./ticker/ticker-item.client";
import { Zap } from "lucide-react";

const TickerWrapper = () => {
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
        <p className="mx-4 text-2xl font-semibold tracking-tighter text-red">
          29,000
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
          <span className="text-theme mr-2 inline-flex items-center">
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
