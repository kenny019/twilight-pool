import TickerWrapper from "../_components/trade/ticker-wrapper";
import TradeWrapper from "../_components/trade/trade-wrapper.client";

export default function Home() {
  return (
    <main className="w-full">
      <TickerWrapper />
      <TradeWrapper />
    </main>
  );
}
