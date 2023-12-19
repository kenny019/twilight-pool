"use client";
import TransferDialog from "@/app/_components/wallet/transfer-dialog.client";
import Button from "@/components/button";
import { Separator } from "@/components/seperator";
import Skeleton from "@/components/skeleton";
import { Text } from "@/components/typography";
import { useTwilight } from "@/lib/providers/singleton";
import BTC from "@/lib/twilight/denoms";
import { useWallet } from "@cosmos-kit/react-lite";
import Big from "big.js";
import { ArrowDownToLine, ArrowLeftRight, Wallet } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { twilightproject } from "twilightjs";

const tradingAccountAddress =
  "0c2611d9cc63de94577c009e04a4f8b4116ff7f663b04ce9e31a52f0f933eeb34254a097e4df1f4513e81a1bf4610cc5e87f2b57059988785da805deed45e8df4d01e938e0";

const Page = () => {
  const { status } = useWallet();
  const router = useRouter();

  // todo: store all twilight values in a provider
  const [twilightBTCBalance, setTwilightBTCBalance] = useState("");
  const [quisBTCBalance, setQuisBTCBalance] = useState("");

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

  const { quisPrivateKey } = useTwilight();

  const { mainWallet } = useWallet();

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

        const stargateClient = await chainWallet.getSigningStargateClient();
        const satsBalance = await stargateClient.getBalance(
          twilightAddress,
          "sats"
        );

        const { amount } = satsBalance;

        const btcBalance = new BTC("BTC", Big(amount));

        setTwilightBTCBalance(btcBalance.value.toFixed(9));
      }

      fetchData();
    }, [status]);
  }

  useGetTwilightBTCBalance();
  useRedirectUnconnected();

  const totalBTCBalance = Big(twilightBTCBalance || 0).plus(
    quisBTCBalance || 0
  );

  return (
    <div className="mx-8 mt-4 space-y-8">
      <div className="flex w-full max-w-4xl flex-row items-baseline justify-between">
        <div className="fspace-y-4">
          <Text heading="h1" className="font-normal">
            Assets Overview
          </Text>
          <div className="space-y-1">
            <Text className="text-6xl">
              {totalBTCBalance.toFixed()}
              <span className="ml-1 inline-flex text-sm">BTC</span>
            </Text>
            <Text className="text-xs text-primary-accent">= 0 USD</Text>
          </div>
        </div>
        <div className="flex w-full max-w-sm flex-col">
          <Text heading="h2" className="text-2xl font-normal">
            My Assets
          </Text>
          <div className="space-y-4">
            <div className="flex w-full justify-between">
              <Text>Funding</Text>
              <div>
                {twilightBTCBalance ? (
                  <>
                    <Text className="text-primary/80">
                      {twilightBTCBalance} BTC
                    </Text>
                    <Text className="text-xs text-primary-accent">
                      = 0.00 USD
                      {/* todo: derive usd value */}
                    </Text>
                  </>
                ) : (
                  <>
                    <Skeleton className="h-6 w-[140px]" />
                    <Skeleton className="mt-1 h-4 w-[80px]" />
                  </>
                )}
              </div>
              <div className="flex flex-row space-x-2">
                <Button variant="ui" size="icon">
                  <ArrowDownToLine className="h-4 w-4" />
                </Button>
                <TransferDialog
                  tradingAccountAddress={tradingAccountAddress}
                  defaultAccount="funding"
                >
                  <Button variant="ui" size="icon">
                    <ArrowLeftRight className="h-4 w-4" />
                  </Button>
                </TransferDialog>
              </div>
            </div>

            <Separator />

            <div className="flex w-full justify-between">
              <Text>Trading</Text>
              <div>
                <Skeleton className="h-6 w-[140px]" />
                {/* <Text className="text-primary/80">BTC</Text> */}
                {/* <Text className="text-xs text-primary-accent">
                  = 56632.11 USD
                </Text> */}
                <Skeleton className="mt-1 h-4 w-[80px]" />
              </div>
              <div className="flex flex-row space-x-2">
                <Button variant="ui" size="icon">
                  <ArrowDownToLine className="h-4 w-4" />
                </Button>

                <TransferDialog
                  tradingAccountAddress="
                  "
                  defaultAccount="trading"
                >
                  <Button variant="ui" size="icon">
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
