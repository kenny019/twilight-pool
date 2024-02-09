"use client";
import TransferDialog from "@/app/_components/wallet/transfer-dialog.client";
import Button from "@/components/button";
import { Separator } from "@/components/seperator";
import { Text } from "@/components/typography";
import useGetTwilightBTCBalance from "@/lib/hooks/useGetTwilightBtcBalance";
import useRedirectUnconnected from "@/lib/hooks/useRedirectUnconnected";
import { usePriceFeed } from "@/lib/providers/feed";
import { useAccountStore } from "@/lib/state/store";
import BTC from "@/lib/twilight/denoms";
import Big from "big.js";
import { ArrowDown, ArrowLeftRight, Wallet } from "lucide-react";
import React, { useState } from "react";

const Page = () => {
  useRedirectUnconnected();

  const { currentPrice } = usePriceFeed();

  const { twilightSats } = useGetTwilightBTCBalance();

  const zKAccounts = useAccountStore((state) => state.zk.zkAccounts);
  const totalTradingSatsBalance = zKAccounts.reduce(
    (acc, account) => (acc += account.value || 0),
    0
  );

  const totalSatsBalance = Big(twilightSats).plus(totalTradingSatsBalance || 0);

  const twilightBTCBalanceString = new BTC("sats", totalSatsBalance)
    .convert("BTC")
    .toFixed(8);

  const twilightSatsBalanceString = new BTC("sats", Big(twilightSats))
    .convert("BTC")
    .mul(currentPrice)
    .toFixed(2);

  const totalTradingBTCValueString = new BTC(
    "sats",
    Big(totalTradingSatsBalance)
  )
    .convert("BTC")
    .mul(currentPrice)
    .toFixed(2);

  const totalTradingBTCBalanceString = new BTC(
    "sats",
    Big(totalTradingSatsBalance)
  )
    .convert("BTC")
    .toFixed(8);

  const totalBTCBalanceString = new BTC(
    "sats",
    totalSatsBalance.plus(totalTradingSatsBalance)
  )
    .convert("BTC")
    .toFixed(8);

  const totalBalanceUSDString = Big(totalBTCBalanceString)
    .mul(currentPrice)
    .toFixed(2);

  return (
    <div className="mx-8 mt-4 space-y-8">
      <div className="flex flex-row justify-between">
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
        </div>
      </div>
      <Separator />
      <div className="flex w-full">
        <div className="w-full space-y-2">
          <Text className="text-md font-normal tracking-tight">My Assets</Text>
          <div className="flex w-full flex-row justify-between border-b py-6 pr-2">
            <div className="flex w-full max-w-md flex-row justify-between">
              <div className="flex flex-row items-center space-x-2">
                <div className="rounded-full bg-button-secondary p-2">
                  <Wallet className="h-5 w-5" />
                </div>
                <Text>Funding</Text>
              </div>
              <div className="w-[150px]">
                <Text className="text-primary/80">
                  {twilightSatsBalanceString} USD
                </Text>
                <Text className="text-xs text-primary-accent">
                  = {twilightBTCBalanceString} BTC
                </Text>
              </div>
            </div>

            <TransferDialog
              tradingAccountAddress={zKAccounts[0]?.address || ""}
              defaultAccount="funding"
            >
              <Button
                className="p-3"
                disabled={twilightSats < 1}
                variant="ui"
                size="icon"
              >
                <ArrowLeftRight className="h-4 w-4" />
              </Button>
            </TransferDialog>
          </div>

          <div className="flex w-full flex-row items-center justify-between border-b py-6 pr-2">
            <div className="flex w-full max-w-md flex-row justify-between">
              <div className="flex flex-row items-center space-x-2">
                <div className="rounded-full bg-button-secondary p-2">
                  <ArrowLeftRight className="h-5 w-5" />
                </div>
                <Text>Trading</Text>
              </div>
              <div className="w-[150px]">
                <Text className="text-primary/80">
                  {totalTradingBTCValueString} USD
                </Text>
                <Text className="text-xs text-primary-accent">
                  = {totalTradingBTCBalanceString} BTC
                </Text>
              </div>
            </div>
            <TransferDialog
              tradingAccountAddress={zKAccounts[0]?.address || ""}
              defaultAccount="trading"
            >
              <Button
                className="p-3"
                disabled={twilightSats < 1}
                variant="ui"
                size="icon"
              >
                <ArrowLeftRight className="h-4 w-4" />
              </Button>
            </TransferDialog>
          </div>

          <div className="pt-4">
            <Text className="text-md font-normal tracking-tight">Loan</Text>
            <div className="flex w-full flex-row items-center justify-between py-6 pr-2">
              <div className="flex w-full max-w-md flex-row justify-between">
                <div className="flex flex-row items-center space-x-2">
                  <div className="rounded-full bg-button-secondary p-2">
                    <ArrowDown className="h-5 w-5" />
                  </div>
                  <Text>Lending</Text>
                </div>
                <div className="w-[150px]">
                  <Text className="text-primary/80">0.00 USD</Text>
                  <Text className="text-xs text-primary-accent">
                    = 0.00000000 BTC
                  </Text>
                </div>
              </div>

              <div className="flex space-x-4">
                <Button size="small">Lend</Button>
                <Button size="small">Redeem</Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Page;