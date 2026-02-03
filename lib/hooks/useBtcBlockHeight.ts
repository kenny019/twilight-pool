import { useQuery } from "@tanstack/react-query";

export default function useBtcBlockHeight() {
  return useQuery({
    queryKey: ["btc-block-height"],
    queryFn: async (): Promise<number> => {
      const res = await fetch("https://mempool.space/api/blocks/tip/height");
      if (!res.ok) throw new Error("Failed to fetch block height");
      return res.json();
    },
    refetchInterval: 30_000,
    staleTime: 15_000,
    retry: 3,
  });
}
