"use client";
import React, { useEffect, useMemo, useState } from "react";
import WalletVerificationForm from "@/app/_components/verification/form";
import { Text } from "@/components/typography";
import { useWallet } from "@cosmos-kit/react-lite";
import { redirect } from "next/navigation";
import useGetRegisteredBTCAddress from "@/lib/hooks/useGetRegisteredBtcAddress";

const noticeData = [
  `Please transfer the exact amount stipulated to one of the Reserve address provided. Please do so within 72 hours to verify your ownership of the BTC address`,
  `You must remember or write down the Reserve ID that you have transferred to else you will not be able to do a withdrawal.`,
  `The verification could take up to 30 mins. Once done you will be notified on the confirmation screen.`,
];

const Page = () => {
  const { mainWallet } = useWallet();

  const chainWallet = mainWallet?.getChainWallet("nyks");

  const registeredBtcResponse = useGetRegisteredBTCAddress(
    mainWallet,
    chainWallet
  );

  const btcDepositAddress = useMemo(() => {
    return registeredBtcResponse?.data?.btcDepositAddress || "";
  }, [registeredBtcResponse?.data]);

  const btcSatoshiTestAmount = useMemo(() => {
    return registeredBtcResponse?.data?.btcSatoshiTestAmount || "";
  }, [registeredBtcResponse?.data]);

  return (
    <div className="flex h-full w-full flex-col px-4 md:px-0">
      <div className="mx-auto my-8 flex h-full w-full max-w-5xl grid-cols-2 flex-col gap-8 sm:my-16 sm:grid md:gap-16">
        <WalletVerificationForm
          btcDepositAddress={btcDepositAddress}
          btcSatoshiTestAmount={btcSatoshiTestAmount}
        />
        <div className="flex flex-col rounded-md border p-4">
          <Text heading="h3">Important:</Text>
          <div className="space-y-2">
            {noticeData.map((text, index) => (
              <Text key={index} asChild className="text-primary opacity-80">
                <li>{text}</li>
              </Text>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Page;
