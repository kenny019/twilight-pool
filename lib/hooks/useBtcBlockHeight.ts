import { useQuery } from "@tanstack/react-query";

const IS_MOCK = process.env.NEXT_PUBLIC_MOCK_MODE === "true";

type BitcoinInfo = {
  blockHeight: number;
  feeEstimate: { satPerVbyte: number; btcPerKb: number; targetBlocks: number };
};

export default function useBtcBlockHeight() {
  return useQuery({
    queryKey: ["bitcoin-info"],
    queryFn: async (): Promise<BitcoinInfo> => {
      if (IS_MOCK) {
        const { MOCK_BITCOIN_INFO } = await import("../mock/constants");
        return MOCK_BITCOIN_INFO;
      }
      const res = await fetch(process.env.NEXT_PUBLIC_BTC_INDEXER_URL as string);
      if (!res.ok) throw new Error("Failed to fetch bitcoin info");
      return res.json();
    },
    select: (data) => data.blockHeight,
    refetchInterval: 30_000,
    staleTime: 15_000,
    retry: 3,
  });
}
