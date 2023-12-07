import { Separator } from "@/components/seperator";
import TickerWrapper from "../_components/trade/ticker-wrapper";
import TradeWrapper from "../_components/trade/trade-wrapper.client";
import { getBTCPrice } from "@/lib/rest";
import { formatCurrency } from "@/lib/twilight/ticker";
import { PriceFeedProvider } from "@/lib/providers/feed";

export default async function Home() {
  const response = await getBTCPrice();

  // todo: fallback to alternative price data or maybe show skeleton if price is not valid
  const btcPrice = response.success
    ? formatCurrency(response.data.result.price)
    : "0";

  return (
    <main>
      <TickerWrapper btcPrice={btcPrice} />
      <Separator orientation="horizontal" />
      <div>
        <PriceFeedProvider>
          <TradeWrapper />
        </PriceFeedProvider>
      </div>
    </main>
  );
}
