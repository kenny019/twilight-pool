import { useQuery } from "@tanstack/react-query";
import wfetch from "../http";
import { priceURL } from "../api/rest";
import { TwilightApiResponse } from "../types";

export type ApyChartRange = "1d" | "7d" | "30d";
export type ApyChartStep = "1m" | "5m" | "15m" | "30m" | "1h" | "2h" | "4h" | "12h";
export type ApyChartLookback = "24 hours" | "7 days" | "30 days";

export interface ApyChartParams {
  range: ApyChartRange;
  step: ApyChartStep;
  lookback: ApyChartLookback;
}

export type ApyPeriod = "1D" | "1W" | "1M";

export const APY_PERIOD_PARAMS: Record<ApyPeriod, ApyChartParams> = {
  "1D": { range: "1d", step: "15m", lookback: "24 hours" },
  "1W": { range: "7d", step: "2h", lookback: "7 days" },
  "1M": { range: "30d", step: "12h", lookback: "30 days" },
};

export interface ApyChartDataPoint {
  time: number;
  value: number;
}

type RawApyDataPoint = {
  apy: string;
  bucket_ts: string;
};

async function fetchApyChartData(
  params: ApyChartParams
): Promise<ApyChartDataPoint[]> {
  const body = JSON.stringify({
    jsonrpc: "2.0",
    method: "apy_chart",
    id: 123,
    params: {
      range: params.range,
      step: params.step,
      lookback: params.lookback,
    },
  });

  const { success, data, error } = await wfetch(priceURL)
    .post({ body })
    .json<TwilightApiResponse<RawApyDataPoint[]>>();

  if (!success) {
    console.error("Failed to fetch APY chart data:", error);
    throw new Error("Failed to fetch APY chart data");
  }

  if (!data.result || data.result.length === 0) {
    return [];
  }

  return data.result
    .map((point) => ({
      time: new Date(point.bucket_ts).getTime() / 1000,
      value: parseFloat(point.apy) * 100, // API returns decimal (0.0821 = 8.21%), convert to percentage for display
    }))
    .sort((a, b) => a.time - b.time);
}

export function useApyChartData(params: ApyChartParams) {
  return useQuery({
    queryKey: ["apyChart", params.range, params.step, params.lookback],
    queryFn: () => fetchApyChartData(params),
    staleTime: 5 * 60 * 1000,
    refetchInterval: 60 * 1000,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}
