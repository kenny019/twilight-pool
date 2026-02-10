"use client";
import React, { useState } from "react";
import Stepper from "@/components/stepper";
import { Text } from "@/components/typography";
import { AlertCircle, Coins, Wallet } from "lucide-react";
import RegistrationStep from "./registration-step";
import VerificationStep from "./verification-step";
import VerificationInfo from "./verification-info";
export type DepositStep = "registration" | "payment";

type Props = {
  registeredAddress: string;
  depositAmount: number;
  isConfirmed: boolean;
};

const depositSteps = [
  { id: "register", label: "Deposit" },
  { id: "payment", label: "Payment" },
];

const registrationNotices = [
  {
    icon: Wallet,
    text: "Enter the Bitcoin address you will use to deposit BTC. This allows Twilight to associate incoming funds with your account.",
  },
  {
    icon: Coins,
    text: "Enter the amount you wish to deposit. Once verified, your BTC will be available for use across the platform.",
  },
];

const stepToNumber: Record<DepositStep, number> = {
  registration: 1,
  payment: 2,
};

const stepTitles: Record<DepositStep, { title: string; subtitle: string }> = {
  registration: {
    title: "BTC Deposit",
    subtitle: "Deposit your Bitcoins directly into Twilight",
  },
  payment: {
    title: "Verify BTC Deposit",
    subtitle: "Deposit your Bitcoins directly into Twilight",
  },
};

const DepositFlow = ({ registeredAddress, depositAmount, isConfirmed }: Props) => {
  // Determine initial step: go to payment if deposit started but not yet confirmed
  const hasPendingDeposit = registeredAddress && !isConfirmed && depositAmount > 0;

  const [step, setStep] = useState<DepositStep>(hasPendingDeposit ? "payment" : "registration");
  const [btcAddress, setBtcAddress] = useState<string>(registeredAddress || "");
  const [btcAmount, setBtcAmount] = useState<number>(depositAmount);

  const currentStepNumber = stepToNumber[step];
  const { title, subtitle } = stepTitles[step];
  const handleRegistrationSuccess = (address: string, amount: string) => {
    setBtcAddress(address);
    setBtcAmount(Number(amount));
    setStep("payment");
  };

  const handleAlreadyRegistered = (address: string) => {
    setBtcAddress(address);
    setStep("payment");
  };

  return (
    <div className="flex h-full w-full flex-col px-4 md:px-0">
      <div className="mx-auto my-8 flex w-full max-w-4xl flex-col gap-8 sm:my-12">
        {/* Header with stepper */}
        <div className="flex flex-col items-center gap-6">
          <div className="text-center">
            <Text heading="h1" className="text-3xl font-semibold sm:text-4xl">
              {title}
            </Text>
            <Text className="mt-2 text-primary-accent">
              {subtitle}
            </Text>
          </div>
          <Stepper
            steps={depositSteps}
            currentStep={currentStepNumber}
            connectorWidth="w-24"
          />
        </div>

        {/* Main content */}
        <div className="grid gap-8 md:grid-cols-2">
          {/* Form section */}
          <div className="rounded-lg border bg-background p-6">
            {step === "registration" && (
              <RegistrationStep
                btcAddress={btcAddress}
                isConfirmed={isConfirmed}
                onSuccess={handleRegistrationSuccess}
              />
            )}
            {step === "payment" && (
              <VerificationStep
                btcDepositAddress={btcAddress}
                btcSatoshiTestAmount={btcAmount}
                onBack={() => setStep("registration")}
                isConfirmed={isConfirmed}
              />
            )}
          </div>

          {/* Important notices section */}
          <div className="flex flex-col gap-4 rounded-lg border bg-background p-6">
            {step === "registration" ? (
              <>
                <Text heading="h3" className="flex items-center gap-2 font-medium">
                  <AlertCircle className="h-5 w-5 text-theme" />
                  Important Information
                </Text>
                <div className="space-y-4">
                  {registrationNotices.map((notice, index) => (
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
              </>
            ) : (
              <VerificationInfo />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DepositFlow;
