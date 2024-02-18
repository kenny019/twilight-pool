import { Separator } from "@/components/seperator";
import TradeWrapper from "../_components/trade/trade-wrapper.client";
import { getBTCPrice, getCandleData } from "@/lib/api/rest";
import TickerWrapper from "../_components/trade/ticker-wrapper.client";
export default async function Home() {
  const btcPriceResponse = await getBTCPrice();
  const candleDataResponse = await getCandleData();

  // todo: fallback to alternative price data or maybe show skeleton if price is not valid
  const btcPrice = btcPriceResponse.success
    ? parseFloat(btcPriceResponse.data.result.price)
    : 0;

  const candleData = candleDataResponse.success
    ? candleDataResponse.data.result
    : [];

  candleData.sort(
    (left, right) => Date.parse(left.end) / 1000 - Date.parse(right.end) / 1000
  );

  return (
    <main>
      <TickerWrapper btcPrice={btcPrice} />
      <Separator orientation="horizontal" />
      <div className="relative h-full w-full">
        <TradeWrapper candleData={candleData} />
      </div>
    </main>
  );
}
