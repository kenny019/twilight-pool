import { WalletStatus } from "@cosmos-kit/core";
import { useWallet } from "@/lib/mock/useMockableWallet";
import { useQuery } from "@tanstack/react-query";

export default function useGetTwilightBTCBalance() {
  const { status, mainWallet } = useWallet();

  const fetchTwilightBalance = async () => {
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
      "sats"
    );

    const { amount } = satsBalance;
    return parseInt(amount);
  };

  const chainWallet = mainWallet?.getChainWallet("nyks");

  const twilightAddress = chainWallet?.address;

  const {
    data: twilightSats = 0,
    isLoading,
    refetch,
    error,
  } = useQuery({
    queryKey: ["twilightBtcBalance", twilightAddress],
    queryFn: fetchTwilightBalance,
    enabled: !!twilightAddress,
    refetchInterval: 2500,
    staleTime: 2500, // Consider data stale after 10 seconds
  });

  return {
    twilightSats,
    isLoading,
    refetch,
    error,
  };
}
