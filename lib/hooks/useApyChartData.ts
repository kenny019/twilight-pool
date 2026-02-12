import { useQuery } from "@tanstack/react-query";
import wfetch from "../http";
import { priceURL } from "../api/rest";
import { TwilightApiResponse } from "../types";

export type ApyChartRange = "24 hours" | "7 days" | "30 days";
export type ApyChartStep =
  | "1 minute"
  | "5 minutes"
  | "15 minutes"
  | "30 minutes"
  | "1 hour"
  | "2 hours"
  | "4 hours"
  | "12 hours";
export type ApyChartLookback = "24 hours" | "7 days" | "30 days";

export interface ApyChartParams {
  range: ApyChartRange;
  step: ApyChartStep;
  lookback: ApyChartLookback;
}

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
      value: parseFloat(point.apy),
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
