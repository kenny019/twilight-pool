import { useQuery } from "@tanstack/react-query";
import { getWithdrawRequests, WithdrawRequest } from "@/lib/api/rest";

export default function useWithdrawRequests(twilightAddress?: string) {
  return useQuery({
    queryKey: ["withdraw-requests", twilightAddress],
    queryFn: async (): Promise<WithdrawRequest[]> => {
      const { success, data } = await getWithdrawRequests();
      if (!success || !data) return [];
      return data.withdrawRequest.filter(
        (req) => req.twilightAddress === twilightAddress
      );
    },
    enabled: !!twilightAddress,
    staleTime: 30_000,
    refetchInterval: 30_000,
  });
}
