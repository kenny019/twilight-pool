import { Separator } from "@/components/seperator";
import TickerWrapper from "../_components/trade/ticker-wrapper";
import TradeWrapper from "../_components/trade/trade-wrapper.client";
import { getBTCPrice } from "@/lib/api/rest";
export default async function Home() {
  const response = await getBTCPrice();

  // todo: fallback to alternative price data or maybe show skeleton if price is not valid
  const btcPrice = response.success
    ? parseFloat(response.data.result.price)
    : 0;

  return (
    <main>
      <TickerWrapper btcPrice={btcPrice} />
      <Separator orientation="horizontal" />
      <div className="relative h-full w-full">
        <TradeWrapper />
      </div>
    </main>
  );
}
