"use client";
import TransferDialog from "@/app/_components/wallet/transfer-dialog.client";
import Button from "@/components/button";
import Resource from "@/components/resource";
import { Separator } from "@/components/seperator";
import Skeleton from "@/components/skeleton";
import { Text } from "@/components/typography";
import { ZK_ACCOUNT_INDEX } from "@/lib/constants";
import useGetTwilightBTCBalance from "@/lib/hooks/useGetTwilightBtcBalance";
import useRedirectUnconnected from "@/lib/hooks/useRedirectUnconnected";
import { usePriceFeed } from "@/lib/providers/feed";
import { useSessionStore } from "@/lib/providers/session";
import { useTwilightStore } from "@/lib/providers/store";
import BTC from "@/lib/twilight/denoms";
import { ZkAccount } from "@/lib/types";
import Big from "big.js";
import { ArrowLeftRight } from "lucide-react";
import React, { useEffect, useState } from "react";
import { TransactionHistoryDataTable } from "./transaction-history/data-table";
import { transactionHistoryColumns } from "./transaction-history/columns";
import { useWallet } from "@cosmos-kit/react-lite";

const Page = () => {
  const privateKey = useSessionStore((state) => state.privateKey);
  const zkAccounts = useTwilightStore((state) => state.zk.zkAccounts);

  const transactionHistory = useTwilightStore(
    (state) => state.history.transactions
  );

  const tradingAccount = zkAccounts[ZK_ACCOUNT_INDEX.MAIN] as
    | ZkAccount
    | undefined;

  const tradingAccountAddress = tradingAccount ? tradingAccount.address : "";

  const { currentPrice } = usePriceFeed();

  // note: incomplete
  function useGetTradingBTCBalance() {
    useEffect(() => {
      async function getTradingBTCBalance() {
        if (!privateKey) return;

        // queryUtxoForAddress("");

        // console.log("trading addresses on chain", tradingAddresses);
      }

      getTradingBTCBalance();
    }, [privateKey]);
  }

  const { twilightSats } = useGetTwilightBTCBalance();

  useRedirectUnconnected();
  useGetTradingBTCBalance();

  const twilightBTCBalanceString = new BTC("sats", Big(twilightSats))
    .convert("BTC")
    .toFixed(8);

  const twilightBalanceUSDString = Big(twilightBTCBalanceString)
    .mul(currentPrice)
    .toFixed(2);

  const zkAccountSatsBalance = zkAccounts.reduce((acc, account) => {
    acc += account.value || 0;

    return acc;
  }, 0);

  const zkAccountBTCString = new BTC("sats", Big(zkAccountSatsBalance))
    .convert("BTC")
    .toFixed(8);

  const zkAccountBTCUSDString = Big(zkAccountBTCString)
    .mul(currentPrice)
    .toFixed(2);

  const totalSatsBalance = Big(twilightSats).plus(zkAccountSatsBalance || 0);

  const totalBTCBalanceString = new BTC("sats", totalSatsBalance)
    .convert("BTC")
    .toFixed(8);

  const totalBalanceUSDString = Big(totalBTCBalanceString)
    .mul(currentPrice)
    .toFixed(2);

  if (!tradingAccountAddress) {
    return <></>;
  }

  return (
    <div className="mx-4 mt-4 space-y-8 md:mx-8">
      <div className="flex w-full max-w-4xl flex-row items-baseline justify-between space-x-6 md:space-x-0">
        <div className="md:space-y-2">
          <Text heading="h1" className="mb-0 text-xl font-normal sm:text-2xl">
            Assets Overview
          </Text>
          <div className="space-y-1">
            <Text className="text-base md:text-4xl">
              {totalBTCBalanceString}
              <span className="ml-0 inline-flex text-sm md:ml-1">BTC</span>
            </Text>
            <Text className="text-xs text-primary-accent">
              = {totalBalanceUSDString} USD
            </Text>
          </div>
        </div>
        <div className="flex w-full max-w-sm flex-col">
          <Text heading="h2" className="text-xl font-normal sm:text-2xl">
            My Assets
          </Text>
          <div className="space-y-4">
            <div className="flex w-full justify-between">
              <Text className="text-sm md:text-base">Funding</Text>
              <div className="min-w-[140px]">
                <Resource
                  isLoaded={!!twilightSats}
                  placeholder={
                    <>
                      <Skeleton className="h-5 w-[140px]" />
                      <Skeleton className="mt-1 h-4 w-[80px]" />
                    </>
                  }
                >
                  <Text className="text-sm text-primary/80 md:text-base">
                    {twilightBTCBalanceString} BTC
                  </Text>
                  <Text className="text-xs text-primary-accent">
                    = {twilightBalanceUSDString} USD
                  </Text>
                </Resource>
              </div>
              <div className="flex flex-row space-x-2">
                {/* <Button variant="ui" size="icon" disabled={twilightSats < 1}>
                  <ArrowDownToLine className="h-4 w-4" />
                </Button> */}
                <TransferDialog
                  tradingAccountAddress={tradingAccountAddress}
                  defaultAccount="funding"
                >
                  <Button disabled={twilightSats < 1} variant="ui" size="icon">
                    <ArrowLeftRight className="h-4 w-4" />
                  </Button>
                </TransferDialog>
              </div>
            </div>

            <Separator />

            <div className="flex w-full justify-between">
              <Text className="text-sm md:text-base">Trading</Text>
              <div className="min-w-[140px]">
                <Resource
                  isLoaded={zkAccountSatsBalance > 0}
                  placeholder={
                    <>
                      <Skeleton className="h-5 w-[140px]" />
                      <Skeleton className="mt-1 h-4 w-[80px]" />
                    </>
                  }
                >
                  <Text className="text-sm text-primary/80 md:text-base">
                    {zkAccountBTCString} BTC
                  </Text>
                  <Text className="text-xs text-primary-accent">
                    = {zkAccountBTCUSDString} USD
                  </Text>
                </Resource>
              </div>
              <div className="flex flex-row space-x-2">
                {/* <Button variant="ui" size="icon" disabled={twilightSats < 1}>
                  <ArrowDownToLine className="h-4 w-4" />
                </Button> */}

                <TransferDialog
                  tradingAccountAddress={tradingAccountAddress}
                  defaultAccount="trading"
                >
                  <Button disabled={twilightSats < 1} variant="ui" size="icon">
                    <ArrowLeftRight className="h-4 w-4" />
                  </Button>
                </TransferDialog>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="space-y-2">
        <Text heading="h2" className="text-xl font-normal sm:text-2xl">
          Account History
        </Text>
        <div className="h-full min-h-[500px] w-full overflow-auto rounded-md border py-1">
          <TransactionHistoryDataTable
            columns={transactionHistoryColumns}
            data={transactionHistory}
          />
        </div>
      </div>
    </div>
  );
};

export default Page;
