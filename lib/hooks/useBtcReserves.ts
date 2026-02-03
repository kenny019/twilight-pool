import { useQuery } from "@tanstack/react-query";
import { getReserveData, BtcReserveStruct } from "@/lib/api/rest";

export default function useBtcReserves() {
  return useQuery({
    queryKey: ["btc-reserves"],
    queryFn: async (): Promise<BtcReserveStruct[]> => {
      const { success, data } = await getReserveData();
      if (!success || !data) return [];
      return data.BtcReserves;
    },
    staleTime: 60_000,
  });
}
