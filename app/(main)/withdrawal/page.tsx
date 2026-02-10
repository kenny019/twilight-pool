"use client";
import BtcWithdrawalForm from "@/app/_components/withdrawal/form";
import WithdrawRequestsTable from "@/app/_components/withdrawal/requests-table";
import WithdrawalInfo from "@/app/_components/withdrawal/withdrawal-info";
import useRedirectUnconnected from "@/lib/hooks/useRedirectUnconnected";
import { useWallet } from "@cosmos-kit/react-lite";
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
            <WithdrawalInfo />
          </div>
        </div>
        <WithdrawRequestsTable twilightAddress={twilightAddress} />
      </div>
    </div>
  );
};

export default Page;
