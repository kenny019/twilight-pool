"use client";
import React, { useEffect } from "react";
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

  if (!registeredBtcResponse) {
    console.log("wallet ext has not mounted");
    // todo: make skeleton layout till wallet has mounted
    return <></>;
  }

  const { data, error, success } = registeredBtcResponse;

  if (!success) {
    console.error(error);
    redirect("/registration");
  }

  const {
    btcDepositAddress,
    // CreationTwilightBlockHeight // todo: calculate expiry time
    btcSatoshiTestAmount,
    // isConfirmed // todo: create dialog to show user has already verified
  } = data;

  return (
    <div className="flex h-full w-full flex-col">
      <div className="mx-auto my-16 grid h-full w-full max-w-5xl grid-cols-2 gap-16">
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
