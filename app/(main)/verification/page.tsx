"use client";
import React, { useMemo } from "react";
import WalletVerificationForm from "@/app/_components/verification/form";
import Stepper from "@/components/stepper";
import { Text } from "@/components/typography";
import { WalletStatus } from "@cosmos-kit/core";
import { useWallet } from "@cosmos-kit/react-lite";
import useGetRegisteredBTCAddress from "@/lib/hooks/useGetRegisteredBtcAddress";
import { AlertCircle, Clock, KeyRound, FileCheck } from "lucide-react";

const verificationSteps = [
  { id: "register", label: "Register" },
  { id: "verify", label: "Verify" },
  { id: "complete", label: "Complete" },
];

const importantNotices = [
  {
    icon: KeyRound,
    text: "Transfer the exact amount shown to one of the Reserve addresses provided. Complete this within 72 hours to verify ownership of your BTC address.",
  },
  {
    icon: FileCheck,
    text: "Remember or write down the Reserve ID you transfer to — you'll need it for withdrawals.",
  },
  {
    icon: Clock,
    text: "Verification can take up to 30 minutes. You'll be notified on the confirmation screen once complete.",
  },
];

const Page = () => {
  const { mainWallet, status } = useWallet();

  const chainWallet = mainWallet?.getChainWallet("nyks");

  const isWalletConnected = status === WalletStatus.Connected;

  return (
    <div className="flex h-full w-full flex-col px-4 md:px-0">
      <div className="mx-auto my-8 flex w-full max-w-4xl flex-col gap-8 sm:my-12">
        {/* Header with stepper */}
        <div className="flex flex-col items-center gap-6">
          <div className="text-center">
            <Text heading="h1" className="text-3xl font-semibold sm:text-4xl">
              Verify BTC Ownership
            </Text>
            <Text className="mt-2 text-primary-accent">
              Complete a small deposit to verify ownership of your Bitcoin
              address
            </Text>
          </div>
          <Stepper
            steps={verificationSteps}
            currentStep={2}
            connectorWidth="w-24"
          />
        </div>

        {/* Wallet connection warning */}
        {!isWalletConnected && (
          <div className="flex items-center gap-3 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4">
            <AlertCircle className="h-5 w-5 shrink-0 text-yellow-500" />
            <div>
              <Text className="font-medium text-yellow-500">
                Wallet not connected
              </Text>
              <Text className="text-sm text-yellow-500/80">
                Please connect your wallet to verify your Bitcoin address.
              </Text>
            </div>
          </div>
        )}

        {/* No registered address warning */}
        {isWalletConnected && (
          <div className="flex items-center gap-3 rounded-lg border border-blue-500/30 bg-blue-500/10 p-4">
            <AlertCircle className="h-5 w-5 shrink-0 text-blue-500" />
            <div>
              <Text className="font-medium text-blue-500">
                No registered BTC address found
              </Text>
              <Text className="text-sm text-blue-500/80">
                Please complete the registration step first before verifying.
              </Text>
            </div>
          </div>
        )}

        {/* Main content */}
        <div className="grid gap-8 md:grid-cols-2">
          {/* Form section */}
          <div className="rounded-lg border bg-background p-6">
            {/* <WalletVerificationForm
              btcDepositAddress={btcDepositAddress}
              btcSatoshiTestAmount={btcSatoshiTestAmount}
            /> */}
          </div>

          {/* Important notices section */}
          <div className="flex flex-col gap-4 rounded-lg border bg-background p-6">
            <Text heading="h3" className="flex items-center gap-2 font-medium">
              <AlertCircle className="h-5 w-5 text-theme" />
              Important Information
            </Text>
            <div className="space-y-4">
              {importantNotices.map((notice, index) => (
                <div key={index} className="flex gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-theme/10">
                    <notice.icon className="h-4 w-4 text-theme" />
                  </div>
                  <Text className="text-sm text-primary-accent leading-relaxed">
                    {notice.text}
                  </Text>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Page;
