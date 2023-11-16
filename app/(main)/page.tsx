"use client";
import { Separator } from "@/components/seperator";
import TickerWrapper from "../_components/trade/ticker-wrapper";
import TradeWrapper from "../_components/trade/trade-wrapper.client";

export default function Home() {
  return (
    <main>
      <TickerWrapper />
      <Separator orientation="horizontal" />
      <div className="m-1">
        <TradeWrapper />
      </div>
    </main>
  );
}
