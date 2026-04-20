"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/dialog";
import Stepper from "@/components/stepper";
import { Text } from "@/components/typography";
import RegistrationStep from "./registration-step";
import VerificationStep from "./verification-step";

type SheetStep = "register" | "verify";

type Props = {
  trigger: React.ReactNode;
  initialAddress?: string;
  initialAmountSats?: number;
  isConfirmed?: boolean;
};

const STEPS = [
  { id: "register", label: "Register" },
  { id: "verify", label: "Verify" },
];

export default function DepositSheet({
  trigger,
  initialAddress = "",
  initialAmountSats = 0,
  isConfirmed = false,
}: Props) {
  const hasPending = !!initialAddress && !isConfirmed && initialAmountSats > 0;
  const [step, setStep] = useState<SheetStep>(hasPending ? "verify" : "register");
  const [btcAddress, setBtcAddress] = useState<string>(initialAddress);
  const [btcAmount, setBtcAmount] = useState<number>(initialAmountSats);

  const stepNumber = step === "register" ? 1 : 2;

  const handleRegistered = (address: string, amount: string) => {
    setBtcAddress(address);
    setBtcAmount(Number(amount));
    setStep("verify");
  };

  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="left-auto right-0 min-h-[100dvh] max-h-[100dvh] w-full max-w-[560px] translate-x-0 rounded-none border-r-0 overflow-y-auto pb-[env(safe-area-inset-bottom)] data-[state=open]:![--tw-enter-scale:1] data-[state=closed]:![--tw-exit-scale:1] data-[state=open]:![--tw-enter-translate-y:0px] data-[state=closed]:![--tw-exit-translate-y:0px] data-[state=open]:![--tw-enter-translate-x:100%] data-[state=closed]:![--tw-exit-translate-x:100%] duration-300">
        <DialogTitle className="sr-only">New deposit</DialogTitle>
        <div className="flex flex-col gap-6 p-2 sm:p-4">
          <div className="flex flex-col gap-2">
            <Text heading="h2" className="text-xl font-semibold sm:text-2xl">
              New Deposit
            </Text>
            <Text className="text-sm text-primary-accent">
              Register a sending address, then send BTC to the active reserve.
            </Text>
          </div>
          <Stepper steps={STEPS} currentStep={stepNumber} connectorWidth="w-12" />

          {step === "register" && (
            <RegistrationStep
              btcAddress={btcAddress}
              isConfirmed={isConfirmed}
              onSuccess={handleRegistered}
            />
          )}
          {step === "verify" && (
            <VerificationStep
              btcDepositAddress={btcAddress}
              btcSatoshiTestAmount={btcAmount}
              isConfirmed={isConfirmed}
              onBack={() => setStep("register")}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
