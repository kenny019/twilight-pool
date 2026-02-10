import { useQuery } from "@tanstack/react-query";
import { getMarketStats } from "../api/rest";

export default function useGetMarketStats() {
  return useQuery({
    queryKey: ["market-stats"],
    queryFn: async () => {
      const response = await getMarketStats();

      if (!response.success || response.error) {
        throw new Error("Failed to fetch market stats");
      }

      return response.data.result;
    },
    refetchInterval: 10000,
    staleTime: 8000,
  });
}
