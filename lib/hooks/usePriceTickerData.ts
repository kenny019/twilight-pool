import { useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CandleData, getCandleData } from "../api/rest";
import { CandleInterval } from "../types";
import dayjs from "dayjs";
import useGetMarketStats from "./useGetMarketStats";

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

type OpenInterestData = {
  openInterest: number;
  openInterestBtc: number;
};

type SkewData = {
  longPercent: number;
  shortPercent: number;
};

async function fetchCandleData(date: string) {
  const candleResponse = await getCandleData({
    since: date,
    interval: CandleInterval.ONE_DAY_CHANGE,
    limit: 1,
    offset: 0,
  });

  if (!candleResponse.success || candleResponse.error) {
    throw new Error("Failed to fetch candle data");
  }

  return candleResponse.data.result[0];
}

export default function usePriceTickerData(currentPrice: number) {
  const queryClient = useQueryClient();

  const yesterday = dayjs().subtract(1, "d").startOf("day").toISOString();
  const today = dayjs().startOf("day").toISOString();

  const candleQuery = useQuery({
    queryKey: ["candle-ticker"],
    queryFn: async (): Promise<CandleData | null> => {
      const [yesterdayCandle, todayCandle] = await Promise.all([
        fetchCandleData(yesterday),
        fetchCandleData(today),
      ]);

      if (!yesterdayCandle || !todayCandle) return null;

      return {
        ...todayCandle,
        close: yesterdayCandle.close,
      };
    },
    refetchInterval: 36000,
    staleTime: 30000,
  });

  const marketStatsQuery = useGetMarketStats();

  const priceTickerData = useMemo<PriceTickerData>(() => {
    if (!candleQuery.data) {
      return { high: 0, low: 0, turnover: 0, change: 0 };
    }

    const { high, low, close, usd_volume: turnover } = candleQuery.data;
    const safeCurrentPrice = currentPrice > 0 ? currentPrice : 0;
    const changeAmount = safeCurrentPrice - parseFloat(close);
    const changePercent =
      safeCurrentPrice > 0 ? (changeAmount / safeCurrentPrice) * 100 : 0;

    return {
      high: parseFloat(high),
      low: parseFloat(low),
      turnover: parseFloat(turnover),
      change: changePercent,
    };
  }, [candleQuery.data, currentPrice]);

  const fundingTickerData = useMemo<FundingTickerData>(() => {
    const fr = marketStatsQuery.data?.funding_rate;
    if (!fr) return { timestamp: "", rate: "" };
    return {
      rate: (fr.funding_rate / 100).toFixed(5),
      timestamp: fr.funding_rate_timestamp,
    };
  }, [marketStatsQuery.data]);

  const openInterestData = useMemo<OpenInterestData>(() => {
    if (!marketStatsQuery.data || currentPrice === 0) {
      return { openInterest: 0, openInterestBtc: 0 };
    }

    const openInterestBtc = marketStatsQuery.data.open_interest_btc / 1e8;
    const openInterest = openInterestBtc * currentPrice;

    return { openInterest, openInterestBtc };
  }, [marketStatsQuery.data, currentPrice]);

  const skewData = useMemo<SkewData>(() => {
    if (!marketStatsQuery.data) {
      return { longPercent: 50, shortPercent: 50 };
    }

    return {
      longPercent: marketStatsQuery.data.long_pct * 100,
      shortPercent: marketStatsQuery.data.short_pct * 100,
    };
  }, [marketStatsQuery.data]);

  const resetFunding = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["market-stats"] });
  }, [queryClient]);

  const hasInit = candleQuery.isSuccess;
  const hasPriceStats = !!candleQuery.data;
  const hasFundingData = !!marketStatsQuery.data?.funding_rate;
  const hasMarketStats = !!marketStatsQuery.data;

  return {
    priceTickerData,
    fundingTickerData,
    openInterestData,
    skewData,
    resetFunding,
    hasInit,
    hasPriceStats,
    hasFundingData,
    hasMarketStats,
  };
}
