import { useQuery } from "@tanstack/react-query";

type BitcoinInfo = {
  blockHeight: number;
  feeEstimate: { satPerVbyte: number; btcPerKb: number; targetBlocks: number };
};

export type FeeEstimate = BitcoinInfo["feeEstimate"];

export default function useBtcFeeRates() {
  return useQuery({
    queryKey: ["bitcoin-info"],
    queryFn: async (): Promise<BitcoinInfo> => {
      const res = await fetch(process.env.NEXT_PUBLIC_BTC_INDEXER_URL as string);
      if (!res.ok) throw new Error("Failed to fetch bitcoin info");
      return res.json();
    },
    select: (data) => data.feeEstimate,
    refetchInterval: 30_000,
    staleTime: 15_000,
    retry: 3,
  });
}
