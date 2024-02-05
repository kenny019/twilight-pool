"use client";
import TransferDialog from "@/app/_components/wallet/transfer-dialog.client";
import Button from "@/components/button";
import Resource from "@/components/resource";
import { Separator } from "@/components/seperator";
import Skeleton from "@/components/skeleton";
import { Text } from "@/components/typography";
import { ZK_ACCOUNT_INDEX } from "@/lib/constants";
import { usePriceFeed } from "@/lib/providers/feed";
import { useTwilight } from "@/lib/providers/twilight";
import { useAccountStore } from "@/lib/state/store";
import BTC from "@/lib/twilight/denoms";
import { ZkAccount } from "@/lib/types";
import { useWallet } from "@cosmos-kit/react-lite";
import Big from "big.js";
import { ArrowDownToLine, ArrowLeftRight } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";

const Page = () => {
  const { status, mainWallet } = useWallet();

  const { quisPrivateKey } = useTwilight();
  const zkAccounts = useAccountStore((state) => state.zk.zkAccounts);

  const tradingAccount = zkAccounts[ZK_ACCOUNT_INDEX.MAIN] as
    | ZkAccount
    | undefined;

  const tradingAccountAddress = tradingAccount ? tradingAccount.address : "";

  const router = useRouter();

  // todo: store all twilight values in a provider
  const [twilightSatsBalance, setTwilightSatsBalance] = useState<number>(0);
  const [totalTradingSatsBalance, setTotalTradingSatsBalance] = useState(0);

  const { currentPrice } = usePriceFeed();

  function useRedirectUnconnected() {
    useEffect(() => {
      if (status !== "Disconnected") {
        return;
      }

      const redirectTimeout = setTimeout(() => {
        console.log(status);

        router.replace("/");
      }, 500);

      return () => clearTimeout(redirectTimeout);
    }, [status]);
  }

  function useGetTwilightBTCBalance() {
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

          console.log("rawSatsBal", amount);

          const btcBalance = new BTC("sats", Big(amount));

          setTwilightSatsBalance(btcBalance.value.toNumber());
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
  }

  // note: incomplete
  function useGetTradingBTCBalance() {
    useEffect(() => {
      async function getTradingBTCBalance() {
        if (!quisPrivateKey) return;

        // queryUtxoForAddress("");

        // console.log("trading addresses on chain", tradingAddresses);
      }

      getTradingBTCBalance();
    }, [quisPrivateKey]);
  }

  useRedirectUnconnected();
  useGetTwilightBTCBalance();
  useGetTradingBTCBalance();

  const totalSatsBalance = Big(twilightSatsBalance || 0).plus(
    totalTradingSatsBalance || 0
  );

  const totalBTCBalanceString = new BTC("sats", totalSatsBalance)
    .convert("BTC")
    .toFixed(8);

  const totalBalanceUSDString = Big(totalBTCBalanceString)
    .mul(currentPrice)
    .toFixed(2);

  const twilightBTCBalanceString = new BTC("sats", Big(twilightSatsBalance))
    .convert("BTC")
    .toFixed(8);

  const twilightBalanceUSDString = Big(twilightBTCBalanceString)
    .mul(currentPrice)
    .toFixed(2);

  return (
    <div className="mx-8 mt-4 space-y-8">
      <div className="flex w-full max-w-4xl flex-row items-baseline justify-between">
        <div className="space-y-2">
          <Text heading="h1" className="text-2xl font-normal">
            Assets Overview
          </Text>
          <div className="space-y-1">
            <Text className="text-4xl">
              {totalBTCBalanceString}
              <span className="ml-1 inline-flex text-sm">BTC</span>
            </Text>
            <Text className="text-xs text-primary-accent">
              = {totalBalanceUSDString} USD
            </Text>
          </div>
        </div>
        <div className="flex w-full max-w-sm flex-col">
          <Text heading="h2" className="text-2xl font-normal">
            My Assets
          </Text>
          <div className="space-y-4">
            <div className="flex w-full justify-between">
              <Text>Funding</Text>
              <div className="min-w-[140px]">
                <Resource
                  isLoaded={!!twilightSatsBalance}
                  placeholder={
                    <>
                      <Skeleton className="h-5 w-[140px]" />
                      <Skeleton className="mt-1 h-4 w-[80px]" />
                    </>
                  }
                >
                  <Text className="text-primary/80">
                    {twilightBTCBalanceString} BTC
                  </Text>
                  <Text className="text-xs text-primary-accent">
                    = {twilightBalanceUSDString} USD
                  </Text>
                </Resource>
              </div>
              <div className="flex flex-row space-x-2">
                <Button
                  variant="ui"
                  size="icon"
                  disabled={twilightSatsBalance < 1}
                >
                  <ArrowDownToLine className="h-4 w-4" />
                </Button>
                <TransferDialog
                  tradingAccountAddress={tradingAccountAddress}
                  defaultAccount="funding"
                >
                  <Button
                    disabled={twilightSatsBalance < 1}
                    variant="ui"
                    size="icon"
                  >
                    <ArrowLeftRight className="h-4 w-4" />
                  </Button>
                </TransferDialog>
              </div>
            </div>

            <Separator />

            <div className="flex w-full justify-between">
              <Text>Trading</Text>
              <div>
                <Skeleton className="h-5 w-[140px]" />
                {/* <Text className="text-primary/80">BTC</Text> */}
                {/* <Text className="text-xs text-primary-accent">
                  = 56632.11 USD
                </Text> */}
                <Skeleton className="mt-1 h-4 w-[80px]" />
              </div>
              <div className="flex flex-row space-x-2">
                <Button
                  variant="ui"
                  size="icon"
                  disabled={twilightSatsBalance < 1}
                >
                  <ArrowDownToLine className="h-4 w-4" />
                </Button>

                <TransferDialog
                  tradingAccountAddress={tradingAccountAddress}
                  defaultAccount="trading"
                >
                  <Button
                    disabled={twilightSatsBalance < 1}
                    variant="ui"
                    size="icon"
                  >
                    <ArrowLeftRight className="h-4 w-4" />
                  </Button>
                </TransferDialog>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="h-full min-h-[500px] w-full rounded-md border"></div>
    </div>
  );
};

export default Page;
