import { useWallet } from "@cosmos-kit/react-lite";
import { useEffect, useMemo, useState } from "react";

export default function useGetTwilightBTCBalance() {
  const [twilightSats, setTwilightSats] = useState(0);

  const sats = useMemo(() => {
    return twilightSats;
  }, [twilightSats]);

  const { status, mainWallet } = useWallet();

  useEffect(() => {
    if (status !== "Connected") return;

    async function fetchData() {
      const chainWallet = mainWallet?.getChainWallet("nyks");

      if (!chainWallet) {
        console.error("no chainWallet");
        return;
      }

      const twilightAddress = chainWallet.address;

      if (!twilightAddress) {
        console.error("no twilightAddress");
        return;
      }

      try {
        const stargateClient = await chainWallet.getSigningStargateClient();
        const satsBalance = await stargateClient.getBalance(
          twilightAddress,
          "sats"
        );

        const { amount } = satsBalance;

        setTwilightSats(parseInt(amount));
      } catch (err) {
        console.error(err);
      }
    }

    fetchData();

    const intervalId = setInterval(async () => {
      await fetchData();
    }, 15000);

    return () => clearInterval(intervalId);
  }, [status]);

  return {
    twilightSats: sats,
    setTwilightSats,
  };
}
