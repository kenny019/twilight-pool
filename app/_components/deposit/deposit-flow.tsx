"use client";
import React, { useState } from "react";
import Stepper from "@/components/stepper";
import { Text } from "@/components/typography";
import { AlertCircle, CheckCircle2, Clock, FileCheck, KeyRound, Wallet } from "lucide-react";
import RegistrationStep from "./registration-step";
import VerificationStep from "./verification-step";
import CompleteStep from "./complete-step";

export type DepositStep = "registration" | "payment" | "complete";

type Props = {
  registeredAddress: string;
  depositAmount: number;
  isConfirmed: boolean;
};

const depositSteps = [
  { id: "register", label: "Deposit" },
  { id: "payment", label: "Payment" },
  { id: "complete", label: "Complete" },
];

const registrationNotices = [
  {
    icon: Wallet,
    text: "Enter the Bitcoin address from which you plan to make deposits so funds can be directed to your account properly.",
  },
  {
    icon: Clock,
    text: "Send the deposit from your Bitcoin address within 24 hours.",
  },
  {
    icon: CheckCircle2,
    text: "Once verified, you'll be able to deposit and trade on the platform.",
  },
];

const verificationNotices = [
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

const stepToNumber: Record<DepositStep, number> = {
  registration: 1,
  payment: 2,
  complete: 3,
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
  complete: {
    title: "Deposit Complete",
    subtitle: "Your Bitcoin address has been verified",
  },
};

const DepositFlow = ({ registeredAddress, depositAmount, isConfirmed }: Props) => {
  // Determine initial step: go to payment if deposit started but not yet confirmed
  const hasPendingDeposit = !isConfirmed && depositAmount > 0;

  const [step, setStep] = useState<DepositStep>(hasPendingDeposit ? "payment" : "registration");
  const [btcAddress, setBtcAddress] = useState<string>(registeredAddress || "");
  const [btcAmount, setBtcAmount] = useState<number>(depositAmount);

  const currentStepNumber = stepToNumber[step];
  const { title, subtitle } = stepTitles[step];
  const notices = step === "registration" ? registrationNotices : verificationNotices;

  const handleRegistrationSuccess = (address: string, amount: string) => {
    setBtcAddress(address);
    setBtcAmount(Number(amount));
    setStep("payment");
  };

  const handleAlreadyRegistered = (address: string) => {
    setBtcAddress(address);
    setStep("payment");
  };

  const handleVerificationSuccess = () => {
    setStep("complete");
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
        {step === "complete" ? (
          <div className="rounded-lg border bg-background p-6">
            <CompleteStep />
          </div>
        ) : (
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
                  onSuccess={handleVerificationSuccess}
                />
              )}
            </div>

            {/* Important notices section */}
            <div className="flex flex-col gap-4 rounded-lg border bg-background p-6">
              <Text heading="h3" className="flex items-center gap-2 font-medium">
                <AlertCircle className="h-5 w-5 text-theme" />
                Important Information
              </Text>
              <div className="space-y-4">
                {notices.map((notice, index) => (
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
        )}
      </div>
    </div>
  );
};

export default DepositFlow;
