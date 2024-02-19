"use client";

import LendDialog from "@/app/_components/trade/lend/lend-dialog.client";
import TransferDialog from "@/app/_components/wallet/transfer-dialog.client";
import Button from "@/components/button";
import { Separator } from "@/components/seperator";
import { Text } from "@/components/typography";
import { executeLendOrder } from "@/lib/api/client";
import { TransactionHash, queryTransactionHashes } from "@/lib/api/rest";
import useGetTwilightBTCBalance from "@/lib/hooks/useGetTwilightBtcBalance";
import useRedirectUnconnected from "@/lib/hooks/useRedirectUnconnected";
import { useToast } from "@/lib/hooks/useToast";
import { usePriceFeed } from "@/lib/providers/feed";
import { useTwilightStore } from "@/lib/providers/store";
import { useTwilight } from "@/lib/providers/twilight";
import BTC from "@/lib/twilight/denoms";
import { executeTradeLendOrderMsg } from "@/lib/twilight/zkos";
import Big from "big.js";
import { ArrowDown, ArrowLeftRight, Loader2, Wallet } from "lucide-react";
import React, { useState } from "react";

const Page = () => {
  useRedirectUnconnected();

  const { toast } = useToast();
  const { currentPrice } = usePriceFeed();
  const { quisPrivateKey } = useTwilight();

  const { twilightSats } = useGetTwilightBTCBalance();

  const zKAccounts = useTwilightStore((state) => state.zk.zkAccounts);
  const lendOrders = useTwilightStore((state) => state.lend.lends);

  const removeLend = useTwilightStore((state) => state.lend.removeLend);

  const [isRedeemLoading, setIsRedeemLoading] = useState(false);
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

  const totalLentSats = lendOrders.reduce((acc, lendOrder) => {
    acc += lendOrder.value;
    return acc;
  }, 0);

  const totalLentBTC = new BTC("sats", Big(totalLentSats))
    .convert("BTC")
    .toFixed(8);

  const totalLentUSDString = Big(totalLentBTC).mul(currentPrice).toFixed(2);

  async function submitRedeemLentSats() {
    try {
      for (const lendOrder of lendOrders) {
        setIsRedeemLoading(true);
        const lendOrderRes = await queryTransactionHashes(
          lendOrder.accountAddress
        );

        const lendOrderData = (lendOrderRes.result as TransactionHash[])[0];

        console.log(lendOrderData);
        if (!lendOrderData) {
          setIsRedeemLoading(false);
          continue;
        }

        const msg = await executeTradeLendOrderMsg({
          outputMemo: lendOrderData.output,
          signature: quisPrivateKey,
          address: lendOrderData.account_id,
          uuid: lendOrderData.order_id,
          orderStatus: lendOrderData.order_status,
          orderType: lendOrderData.order_type,
          transactionType: "LENDTX",
          executionPricePoolshare: 1,
        });

        console.log(msg);

        const executeLendRes = await executeLendOrder(msg);
        console.log("executeLendRes", executeLendRes);

        removeLend(lendOrder);

        setIsRedeemLoading(false);
        toast({
          title: "Success",
          description: "Redeemed lend sats successfully",
        });
      }
    } catch (err) {
      setIsRedeemLoading(false);
      console.error(err);
    }
  }

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
                  <Text className="text-primary/80">
                    {totalLentUSDString} USD
                  </Text>
                  <Text className="text-xs text-primary-accent">
                    = {totalLentBTC} BTC
                  </Text>
                </div>
              </div>

              <div className="flex space-x-4">
                <LendDialog>
                  <Button size="small">Lend</Button>
                </LendDialog>
                <Button
                  onClick={async (e) => {
                    e.preventDefault();
                    await submitRedeemLentSats();
                  }}
                  size="small"
                >
                  {isRedeemLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    "Redeem"
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Page;
