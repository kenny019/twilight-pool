"use client";
import TransferDialog from "@/app/_components/wallet/transfer-dialog.client";
import Button from "@/components/button";
import Resource from "@/components/resource";
import { Separator } from "@/components/seperator";
import Skeleton from "@/components/skeleton";
import { Text } from "@/components/typography";
import { useTwilight } from "@/lib/providers/singleton";
import { getUtxosFromDB } from "@/lib/twilight/chain";
import BTC from "@/lib/twilight/denoms";
import { addressMonitoring } from "@/lib/twilight/zkos";
import { useWallet } from "@cosmos-kit/react-lite";
import Big from "big.js";
import { ArrowDownToLine, ArrowLeftRight, Wallet } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";

const Page = () => {
  const { status, mainWallet } = useWallet();

  const { quisPrivateKey, mainTradingAccount } = useTwilight();

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

          const btcBalance = new BTC("sats", Big(amount));

          setTwilightBTCBalance(btcBalance.convert("BTC").toFixed(9));
        } catch (err) {
          console.error(err);
        }
      }

      fetchData();
    }, [status]);
  }

  // note: incomplete
  function useGetTradingBTCBalance() {
    useEffect(() => {
      async function getTradingBTCBalance() {
        if (!quisPrivateKey) return;
        const utxoString = await getUtxosFromDB();
        // const tradingAddresses = await addressMonitoring(
        //   quisPrivateKey,
        //   utxoString
        // );

        // console.log("trading addresses on chain", tradingAddresses);
      }

      getTradingBTCBalance();
    }, [quisPrivateKey]);
  }

  useRedirectUnconnected();
  useGetTwilightBTCBalance();
  useGetTradingBTCBalance();

  const totalBTCBalance = Big(twilightBTCBalance || 0).plus(
    quisBTCBalance || 0
  );

  return (
    <div className="mx-8 mt-4 space-y-8">
      <div className="flex w-full max-w-4xl flex-row items-baseline justify-between">
        <div className="space-y-2">
          <Text heading="h1" className="text-2xl font-normal">
            Assets Overview
          </Text>
          <div className="space-y-1">
            <Text className="text-4xl">
              {totalBTCBalance.toFixed(9)}
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
              <div className="min-w-[140px]">
                <Resource
                  isLoaded={!!twilightBTCBalance}
                  placeholder={
                    <>
                      <Skeleton className="h-5 w-[140px]" />
                      <Skeleton className="mt-1 h-4 w-[80px]" />
                    </>
                  }
                >
                  <Text className="text-primary/80">
                    {twilightBTCBalance} BTC
                  </Text>
                  <Text className="text-xs text-primary-accent">
                    = 0.00 USD
                    {/* todo: derive usd value */}
                  </Text>
                </Resource>
              </div>
              <div className="flex flex-row space-x-2">
                <Button variant="ui" size="icon">
                  <ArrowDownToLine className="h-4 w-4" />
                </Button>
                <TransferDialog
                  tradingAccountAddress={mainTradingAccount?.address || ""}
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
                <Skeleton className="h-5 w-[140px]" />
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
