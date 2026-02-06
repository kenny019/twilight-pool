import { useQuery } from "@tanstack/react-query";
import { getCandleData, type CandleData } from "@/lib/api/rest";
import { CandleInterval } from "@/lib/types";
import dayjs from "dayjs";

const INTERVAL_OFFSETS: Record<string, { unit: dayjs.ManipulateType; amount: number }> = {
  [CandleInterval.ONE_MINUTE]: { unit: "minute", amount: 720 },
  [CandleInterval.FIFTEEN_MINUTE]: { unit: "minute", amount: 10800 },
  [CandleInterval.ONE_HOUR]: { unit: "day", amount: 7 },
  [CandleInterval.FOUR_HOUR]: { unit: "hour", amount: 720 },
  [CandleInterval.ONE_DAY]: { unit: "day", amount: 90 },
};

export function useCandleData(interval: CandleInterval) {
  return useQuery<CandleData[]>({
    queryKey: ["candle-data", interval],
    queryFn: async () => {
      const offset = INTERVAL_OFFSETS[interval] ?? { unit: "minute", amount: 720 };
      const since = dayjs().subtract(offset.amount, offset.unit).toISOString();
      const res = await getCandleData({ since, interval, limit: 1000 });
      return res.success ? res.data.result : [];
    },
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}
