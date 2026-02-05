"use client";
import BtcWithdrawalForm from "@/app/_components/withdrawal/form";
import WithdrawRequestsTable from "@/app/_components/withdrawal/requests-table";
import { Text } from "@/components/typography";
import useRedirectUnconnected from "@/lib/hooks/useRedirectUnconnected";
import { useWallet } from "@cosmos-kit/react-lite";
import { AlertCircle, Clock, Coins, Wallet } from "lucide-react";
import React from "react";

const Page = () => {
  useRedirectUnconnected();
  const { mainWallet } = useWallet();
  const chainWallet = mainWallet?.getChainWallet("nyks");
  const twilightAddress = chainWallet?.address;

  return (
    <div className="flex h-full w-full flex-col px-4 md:px-0">
      <div className="mx-auto my-8 flex w-full max-w-4xl flex-col gap-8 sm:my-12">
        <div className="grid gap-8 md:grid-cols-2">
          <BtcWithdrawalForm />
          <div className="flex flex-col gap-4 rounded-lg border bg-background p-6">
            <Text heading="h3" className="flex items-center gap-2 font-medium">
              <AlertCircle className="h-5 w-5 text-theme" />
              Important Information
            </Text>
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-theme/10">
                  <Wallet className="h-4 w-4 text-theme" />
                </div>
                <Text className="text-sm text-primary-accent leading-relaxed">
                  The reserve ID must match the reserve address you have registered with.
                </Text>
              </div>
              <div className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-theme/10">
                  <Clock className="h-4 w-4 text-theme" />
                </div>
                <Text className="text-sm text-primary-accent leading-relaxed">
                  Withdrawals will be completed once the reserve is swept, every 144 Bitcoin blocks.
                </Text>
              </div>
              <div className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-theme/10">
                  <Coins className="h-4 w-4 text-theme" />
                </div>
                <Text className="text-sm text-primary-accent leading-relaxed">
                  Amount withdrawn will be subject to BTC chain fees.
                </Text>
              </div>
            </div>
          </div>
        </div>
        <WithdrawRequestsTable twilightAddress={twilightAddress} />
      </div>
    </div>
  );
};

export default Page;
