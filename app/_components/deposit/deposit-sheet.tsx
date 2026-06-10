"use client";

import React, { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/sheet";
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
  /** Controlled open state — lets the page open the sheet from elsewhere
   * (e.g. the active card's "Choose reserve" CTA) and react on close. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
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
  open,
  onOpenChange,
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
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent side="right">
        <SheetTitle className="sr-only">New deposit</SheetTitle>
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
      </SheetContent>
    </Sheet>
  );
}
