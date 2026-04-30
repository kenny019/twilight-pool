"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/sheet";
import { Text } from "@/components/typography";
import BtcWithdrawalForm from "./form";

type Props = {
  trigger: React.ReactNode;
};

export default function WithdrawalSheet({ trigger }: Props) {
  const [open, setOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const wasOpen = useRef(false);

  useEffect(() => {
    if (wasOpen.current && !open) setFormKey((k) => k + 1);
    wasOpen.current = open;
  }, [open]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent side="right">
        <SheetTitle className="sr-only">New withdrawal</SheetTitle>
        <div className="flex flex-col gap-5 p-2 sm:p-4">
          <div className="flex flex-col gap-1">
            <Text heading="h2" className="text-xl font-semibold sm:text-2xl">
              New Withdrawal
            </Text>
            <Text className="text-sm text-primary-accent">
              Sends BTC back to the address you registered for deposits.
            </Text>
          </div>

          <BtcWithdrawalForm
            key={formKey}
            hideChrome
            onSubmitted={() => setOpen(false)}
          />

          <ul className="mt-1 flex flex-col gap-1 text-[11px] text-primary-accent">
            <li>• Withdrawals are paid out after the selected reserve is swept.</li>
            <li>• Use the reserve your last deposit was credited into.</li>
          </ul>
        </div>
      </SheetContent>
    </Sheet>
  );
}
