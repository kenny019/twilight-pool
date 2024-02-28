import { useEffect, useState } from "react";
import { getHistoricalPrice } from "../twilight/ticker";
import { getCandleData } from "../api/rest";

type PriceTickerData = {
  high: number;
  low: number;
  turnover: number;
  change: number;
};

export default function usePriceTickerData(currentPrice: number) {
  const [priceTickerData, setPriceTickerData] = useState<PriceTickerData>({
    high: 0,
    low: 0,
    turnover: 0,
    change: 0,
  });

  useEffect(() => {
    async function getPriceTickerData() {
      const date = new Date();
      date.setDate(date.getDate() - 1);

      const yesterday = date.toISOString();

      const candleResponse = await getCandleData({
        since: yesterday,
        interval: "ONE_DAY",
        limit: 1,
        offset: 0,
      });

      if (!candleResponse.success || candleResponse.error) {
        return;
      }

      const { result } = candleResponse.data;

      const candleData = result[0];

      if (!candleData) {
        return;
      }

      const { high, low, close, usd_volume: turnover } = candleData;

      // const priceData = await getHistoricalPrice(
      //   yesterday,
      //   999, // todo: get all entries
      //   0
      // );

      // const newTickerData = priceData.reduce<Omit<PriceTickerData, "change">>(
      //   (acc, entry) => {
      //     acc.high = Math.max(acc.high, parseFloat(entry.price));
      //     acc.low =
      //       acc.low === 0
      //         ? parseFloat(entry.price)
      //         : Math.min(acc.low, parseFloat(entry.price));

      //     return acc;
      //   },
      //   {
      //     high: 0,
      //     low: 0,
      //     turnover: 0,
      //   }
      // );

      const changeAmount = currentPrice - parseFloat(close);
      const changePercent = (changeAmount / currentPrice) * 100;

      const tickerData = {
        high: parseInt(high),
        low: parseInt(low),
        turnover: parseInt(turnover),
        change: changePercent,
      };

      setPriceTickerData(tickerData);
    }

    if (currentPrice === 0) return;

    getPriceTickerData();
  }, [currentPrice]);

  return priceTickerData;
}
