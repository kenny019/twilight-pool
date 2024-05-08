import { Separator } from "@/components/seperator";
import TradeWrapper from "../_components/trade/trade-wrapper.client";
import TickerWrapper from "../_components/trade/ticker-wrapper.client";

export default async function Home() {
  return (
    <main>
      <TickerWrapper />
      <Separator orientation="horizontal" />
      <div className="relative h-full w-full">
        <TradeWrapper />
      </div>
    </main>
  );
}
