import { useQuery } from "@tanstack/react-query";

type FeeRates = {
  fastestFee: number;
  halfHourFee: number;
  hourFee: number;
  economyFee: number;
  minimumFee: number;
};

export default function useBtcFeeRates() {
  return useQuery({
    queryKey: ["btc-fee-rates"],
    queryFn: async (): Promise<FeeRates> => {
      const res = await fetch("https://mempool.space/api/v1/fees/recommended");
      if (!res.ok) throw new Error("Failed to fetch fee rates");
      return res.json();
    },
    refetchInterval: 30_000,
    staleTime: 15_000,
    retry: 3,
  });
}
