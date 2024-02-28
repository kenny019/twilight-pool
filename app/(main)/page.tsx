import { Separator } from "@/components/seperator";
import TradeWrapper from "../_components/trade/trade-wrapper.client";
import { getBTCPrice, getCandleData } from "@/lib/api/rest";
import TickerWrapper from "../_components/trade/ticker-wrapper.client";
import { CandleInterval } from "@/lib/types";

async function getChartCandleData() {
  try {
    const since = new Date();
    since.setMinutes(since.getMinutes() - 15);

    const candleDataResponse = await getCandleData({
      since: since.toISOString(),
      interval: CandleInterval.ONE_MINUTE,
    });

    const candleData = candleDataResponse.success
      ? candleDataResponse.data.result
      : [];

    candleData.sort(
      (left, right) =>
        Date.parse(left.end) / 1000 - Date.parse(right.end) / 1000
    );

    return candleData;
  } catch (err) {
    console.error(err);
    return [];
  }
}

export default async function Home() {
  const btcPriceResponse = await getBTCPrice();

  const chartData = await getChartCandleData();

  // todo: fallback to alternative price data or maybe show skeleton if price is not valid
  const btcPrice = btcPriceResponse.success
    ? parseFloat(btcPriceResponse.data.result.price)
    : 0;

  return (
    <main>
      <TickerWrapper btcPrice={btcPrice} />
      <Separator orientation="horizontal" />
      <div className="relative h-full w-full">
        <TradeWrapper candleData={chartData} />
      </div>
    </main>
  );
}
