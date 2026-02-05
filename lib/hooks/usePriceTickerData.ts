import { useCallback, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CandleData,
  getCandleData,
  getFundingRate,
  getPositionSize,
} from "../api/rest";
import { CandleInterval } from "../types";
import dayjs from "dayjs";
import Big from "big.js";

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
  const [fundingEnabled, setFundingEnabled] = useState(true);

  const yesterday = dayjs().subtract(2, "d").startOf("day").toISOString();
  const today = dayjs().subtract(1, "d").startOf("day").toISOString();

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

  const fundingQuery = useQuery({
    queryKey: ["funding-rate"],
    queryFn: async () => {
      const fundingRes = await getFundingRate();

      if (!fundingRes.success || fundingRes.error) {
        throw new Error("Failed to fetch funding rate");
      }

      return fundingRes.data.result;
    },
    enabled: fundingEnabled,
    refetchInterval: false,
  });

  const positionSizeQuery = useQuery({
    queryKey: ["position-size"],
    queryFn: async () => {
      const response = await getPositionSize();

      if (!response.success || response.error) {
        throw new Error("Failed to fetch position size");
      }

      return response.data.result;
    },
    refetchInterval: 10000,
    staleTime: 8000,
  });

  const priceTickerData = useMemo<PriceTickerData>(() => {
    if (!candleQuery.data || currentPrice === 0) {
      return { high: 0, low: 0, turnover: 0, change: 0 };
    }

    const { high, low, close, usd_volume: turnover } = candleQuery.data;
    const changeAmount = currentPrice - parseFloat(close);
    const changePercent = (changeAmount / currentPrice) * 100;

    return {
      high: parseFloat(high),
      low: parseFloat(low),
      turnover: parseFloat(turnover),
      change: changePercent,
    };
  }, [candleQuery.data, currentPrice]);

  const fundingTickerData = useMemo<FundingTickerData>(() => {
    if (!fundingQuery.data) {
      return { timestamp: "", rate: "" };
    }

    return {
      rate: parseFloat(fundingQuery.data?.rate || "0").toFixed(5),
      timestamp: fundingQuery.data?.timestamp || "",
    };
  }, [fundingQuery.data]);

  const openInterestData = useMemo<OpenInterestData>(() => {
    if (!positionSizeQuery.data || currentPrice === 0) {
      return { openInterest: 0, openInterestBtc: 0 };
    }

    const { total } = positionSizeQuery.data;
    const openInterest = Big(total).div(100_000_000);
    const openInterestBtc = openInterest.div(currentPrice).toNumber();

    return { openInterest: openInterest.toNumber(), openInterestBtc };
  }, [positionSizeQuery.data, currentPrice]);

  const skewData = useMemo<SkewData>(() => {
    if (!positionSizeQuery.data) {
      return { longPercent: 50, shortPercent: 50 };
    }

    const { total_long, total_short } = positionSizeQuery.data;
    const long = parseFloat(total_long);
    const short = parseFloat(total_short);
    const total = long + short;

    if (total === 0) return { longPercent: 50, shortPercent: 50 };

    return {
      longPercent: (long / total) * 100,
      shortPercent: (short / total) * 100,
    };
  }, [positionSizeQuery.data]);

  const resetFunding = useCallback(() => {
    setFundingEnabled(true);
    queryClient.invalidateQueries({ queryKey: ["funding-rate"] });
  }, [queryClient]);

  const hasInit = !!candleQuery.data;

  return {
    priceTickerData,
    fundingTickerData,
    openInterestData,
    skewData,
    resetFunding,
    hasInit,
  };
}
