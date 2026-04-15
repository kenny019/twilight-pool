import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import useGetMarketStats from "./useGetMarketStats";
import dayjs from "dayjs";

/**
 * Independent funding cycle detector.
 * Uses market_stats.funding_rate.funding_rate_timestamp as source of truth,
 * triggers funding history refresh when the clock crosses the next hourly
 * boundary. Decoupled from the ticker.
 */
export function useFundingCycleTrigger() {
  const queryClient = useQueryClient();
  const lastTriggeredRef = useRef<number>(0);

  const marketStats = useGetMarketStats();
  const fundingTimestamp = marketStats.data?.funding_rate?.funding_rate_timestamp;

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

        queryClient.invalidateQueries({ queryKey: ["market-stats"] });
        queryClient.invalidateQueries({ queryKey: ["funding-history-refresh"] });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [fundingTimestamp, queryClient]);
}
