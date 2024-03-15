import { useCallback, useEffect, useRef, useState } from "react";
import { CandleData, getCandleData, getFundingRate } from "../api/rest";
import { CandleInterval } from "../types";

type PriceTickerData = {
  high: number;
  low: number;
  turnover: number;
  change: number;
};

type FundingTickerData = {
  timestamp: string;
  rate: string;
};

export default function usePriceTickerData(currentPrice: number) {
  const [priceTickerData, setPriceTickerData] = useState<PriceTickerData>({
    high: 0,
    low: 0,
    turnover: 0,
    change: 0,
  });

  // const matchedAddress = searchZkAccount({
  //   inputAddresses: ["0x...", "0x..."],
  //   outputAddress: ["...", "..."],
  //   tx_hash: "",
  // })

  const [shouldFetchFunding, setShouldFetchFunding] = useState(true);

  const [fundingTickerData, setFundingTickerData] = useState<FundingTickerData>(
    {
      timestamp: "",
      rate: "",
    }
  );

  const resetFunding = useCallback(() => {
    setFundingTickerData({
      timestamp: "",
      rate: "",
    });
    setShouldFetchFunding(true);
  }, []);

  function useGetPriceTickerData() {
    useEffect(() => {
      async function getPriceTickerData() {
        const date = new Date();
        date.setDate(date.getDate() - 1);

        const yesterday = date.toISOString();

        try {
          const candleResponse = await getCandleData({
            since: yesterday,
            interval: CandleInterval.ONE_DAY,
            limit: 1,
            offset: 0,
            revalidate: 3600, // 1 hour
          });

          if (!candleResponse.success || candleResponse.error) {
            console.error(candleResponse);
            return;
          }

          const { result } = candleResponse.data;

          const candleData = result[0];

          if (!candleData) {
            return;
          }

          const { high, low, close, usd_volume: turnover } = candleData;

          const changeAmount = currentPrice - parseFloat(close);
          const changePercent = (changeAmount / currentPrice) * 100;

          const tickerData = {
            high: parseFloat(high),
            low: parseFloat(low),
            turnover: parseFloat(turnover),
            change: changePercent,
          };

          setPriceTickerData(tickerData);
        } catch (err) {
          console.error(err);
        }
      }

      if (currentPrice === 0) return;

      getPriceTickerData();
    }, [currentPrice]);
  }

  function useGetFundingRate() {
    useEffect(() => {
      async function getFunding() {
        if (!shouldFetchFunding) return;

        const fundingRes = await getFundingRate();

        if (!fundingRes.success || fundingRes.error) {
          console.error(fundingRes);
          return;
        }

        const { result: fundingData } = fundingRes.data;

        setFundingTickerData({
          rate: parseFloat(fundingData.rate).toFixed(5),
          timestamp: fundingData.timestamp,
        });

        setShouldFetchFunding(false);
      }

      getFunding();
    }, [shouldFetchFunding]);
  }

  useGetFundingRate();
  useGetPriceTickerData();

  return { priceTickerData, fundingTickerData, resetFunding };
}
