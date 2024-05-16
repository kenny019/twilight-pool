import { useCallback, useEffect, useRef, useState } from "react";
import { CandleData, getCandleData, getFundingRate } from "../api/rest";
import { CandleInterval } from "../types";
import { useInterval } from "./useInterval";
import dayjs from "dayjs";

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

  const [hasInit, setHasInit] = useState(false);

  const [candleYesterdayData, setCandleYesterdayData] = useState<CandleData>();

  const [shouldFetchFunding, setShouldFetchFunding] = useState(true);

  const [fundingTickerData, setFundingTickerData] = useState<FundingTickerData>(
    {
      timestamp: "",
      rate: "",
    }
  );

  async function fetchCandleData(date: string) {
    try {
      const candleResponse = await getCandleData({
        since: date,
        interval: CandleInterval.ONE_DAY_CHANGE,
        limit: 1,
        offset: 0,
      });

      if (!candleResponse.success || candleResponse.error) {
        console.error("error getting candle data >>", candleResponse);
        return;
      }
      const { result } = candleResponse.data;

      const candleData = result[0];

      return candleData;
    } catch (err) {
      console.error(err);
    }
  }

  const resetFunding = useCallback(() => {
    setFundingTickerData({
      timestamp: "",
      rate: fundingTickerData.rate,
    });
    setShouldFetchFunding(true);
  }, [fundingTickerData]);

  const updateCandleData = useCallback(async () => {
    const yesterday = dayjs().subtract(2, "d").toISOString();
    const today = dayjs().subtract(1, "d").toISOString();

    const [yesterdayCandleRes, todayCandleRes] = await Promise.all([
      fetchCandleData(yesterday),
      fetchCandleData(today),
    ]);

    if (!yesterdayCandleRes || !todayCandleRes) return;

    const latestCandledata: CandleData = {
      ...todayCandleRes,
      close: yesterdayCandleRes.close,
    };

    setCandleYesterdayData(latestCandledata);

    if (hasInit) return;

    setHasInit(true);
  }, [hasInit, setHasInit, setCandleYesterdayData]);

  useEffect(() => {
    if (candleYesterdayData) return;

    updateCandleData();
  }, [candleYesterdayData, hasInit, setHasInit, updateCandleData]);

  useInterval(() => {
    updateCandleData();
  }, 36000);

  function useGetPriceTickerData() {
    useEffect(() => {
      async function getPriceTickerData() {
        if (!candleYesterdayData) return;

        const { high, low, close, usd_volume: turnover } = candleYesterdayData;

        const changeAmount = currentPrice - parseFloat(close);
        const changePercent = (changeAmount / currentPrice) * 100;

        const tickerData = {
          high: parseFloat(high),
          low: parseFloat(low),
          turnover: parseFloat(turnover),
          change: changePercent,
        };

        setPriceTickerData(tickerData);
      }

      if (currentPrice === 0) return;

      getPriceTickerData();
    }, [currentPrice, candleYesterdayData]);
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
          rate: parseFloat(fundingData?.rate || "0").toFixed(5),
          timestamp: fundingData?.timestamp || "",
        });

        setShouldFetchFunding(false);
      }

      getFunding();
    }, [shouldFetchFunding]);
  }

  useGetFundingRate();
  useGetPriceTickerData();

  return { priceTickerData, fundingTickerData, resetFunding, hasInit };
}
