"use client";

import React, { useEffect, useState } from "react";
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
import { writeDepositIntent } from "@/lib/depositIntentStorage";

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
  /** Skip the register step on open — a deposit (chain-pending or
   * client-side intent) is already in flight. */
  startAtVerify?: boolean;
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
  startAtVerify,
}: Props) {
  const hasPending = !!initialAddress && !isConfirmed && initialAmountSats > 0;
  const initialVerify = startAtVerify ?? hasPending;
  const [step, setStep] = useState<SheetStep>(initialVerify ? "verify" : "register");
  const [btcAddress, setBtcAddress] = useState<string>(initialAddress);
  const [btcAmount, setBtcAmount] = useState<number>(initialAmountSats);

  // The deposit in flight can change while the sheet is closed (intent
  // written, registration confirmed), so re-derive step and prefill from
  // props each time the sheet opens.
  useEffect(() => {
    if (!open) return;
    setStep(initialVerify ? "verify" : "register");
    setBtcAddress(initialAddress);
    setBtcAmount(initialAmountSats);
  }, [open, initialVerify, initialAddress, initialAmountSats]);

  const stepNumber = step === "register" ? 1 : 2;

  const handleRegistered = (address: string, amount: string) => {
    setBtcAddress(address);
    setBtcAmount(Number(amount));
    // Repeat deposits (registration already confirmed) skip the chain
    // broadcast, so nothing on-chain marks this deposit as in-flight.
    // Persist a client-side intent that DepositPageShell derives the
    // awaiting-send card from.
    if (isConfirmed) {
      writeDepositIntent(address, {
        amountSats: Number(amount),
        createdAt: new Date().toISOString(),
      });
    }
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
