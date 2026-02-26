import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getFundingRate } from "../api/rest";
import dayjs from "dayjs";

/**
 * Independent funding cycle detector (Option A).
 * Uses funding-rate API as source of truth, triggers funding history refresh
 * when the clock crosses the next hourly boundary. Decoupled from the ticker.
 */
export function useFundingCycleTrigger() {
  const queryClient = useQueryClient();
  const lastTriggeredRef = useRef<number>(0);

  const fundingQuery = useQuery({
    queryKey: ["funding-rate"],
    queryFn: async () => {
      const fundingRes = await getFundingRate();
      if (!fundingRes.success || fundingRes.error) {
        throw new Error("Failed to fetch funding rate");
      }
      return fundingRes.data.result;
    },
    staleTime: 60_000,
  });

  const fundingTimestamp = fundingQuery.data?.timestamp;

  useEffect(() => {
    if (!fundingTimestamp) return;

    const timer = setInterval(() => {
      const now = dayjs();
      const fundingTime = dayjs(fundingTimestamp);
      const nextFunding = fundingTime.add(1, "hour");

      if (now.isAfter(nextFunding) || now.isSame(nextFunding)) {
        // Avoid double-triggering within the same cycle
        const cycleKey = Math.floor(nextFunding.valueOf() / 3600000);
        if (lastTriggeredRef.current === cycleKey) return;
        lastTriggeredRef.current = cycleKey;

        queryClient.invalidateQueries({ queryKey: ["funding-rate"] });
        queryClient.invalidateQueries({ queryKey: ["funding-history-refresh"] });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [fundingTimestamp, queryClient]);
}
