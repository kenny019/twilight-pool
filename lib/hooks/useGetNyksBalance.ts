import { useWallet } from "@/lib/mock/useMockableWallet";
import { useQuery } from "@tanstack/react-query";

export default function useGetNyksBalance() {
  const { status, mainWallet } = useWallet();

  const fetchNyksBalance = async () => {
    const chainWallet = mainWallet?.getChainWallet("nyks");

    if (!chainWallet) {
      throw new Error("no chainWallet");
    }

    const twilightAddress = chainWallet.address;

    if (!twilightAddress) {
      throw new Error("no twilightAddress");
    }

    const stargateClient = await chainWallet.getSigningStargateClient();
    const satsBalance = await stargateClient.getBalance(
      twilightAddress,
      "nyks"
    );

    const { amount } = satsBalance;
    return parseInt(amount);
  };

  const chainWallet = mainWallet?.getChainWallet("nyks");

  const twilightAddress = chainWallet?.address;

  const {
    data: nyksBalance = 0,
    isLoading,
    refetch,
    error,
  } = useQuery({
    queryKey: ["nyksBalance", twilightAddress],
    queryFn: fetchNyksBalance,
    enabled: !!twilightAddress,
    refetchInterval: 2500,
    staleTime: 2500, // Consider data stale after 10 seconds
  });

  return {
    nyksBalance,
    isLoading,
    refetch,
    error,
  };
}
