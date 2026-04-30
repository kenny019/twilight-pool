"use client";

import React from "react";
import { Text } from "@/components/typography";
import { Wallet } from "lucide-react";
import RegistrationStep from "./registration-step";

type Props = {
  onRegistered: (address: string, amount: string) => void;
};

export default function RegisterAddressPrompt({ onRegistered }: Props) {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6 rounded-lg border bg-background p-6">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-theme/10 text-theme">
          <Wallet className="h-4 w-4" />
        </div>
        <div className="flex flex-col gap-1">
          <Text heading="h2" className="text-lg font-semibold sm:text-xl">
            Register a Bitcoin sending address
          </Text>
          <Text className="text-sm text-primary-accent">
            Twilight matches incoming BTC to your account by the address you send
            from. Register it once to unlock deposits.
          </Text>
        </div>
      </div>
      <RegistrationStep onSuccess={onRegistered} />
    </div>
  );
}
