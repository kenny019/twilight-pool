"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/dialog";
import { Text } from "@/components/typography";
import BtcWithdrawalForm from "./form";

type Props = {
  trigger: React.ReactNode;
};

export default function WithdrawalSheet({ trigger }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="left-auto right-0 min-h-[100dvh] max-h-[100dvh] w-full max-w-[560px] translate-x-0 rounded-none border-r-0 overflow-y-auto pb-[env(safe-area-inset-bottom)] data-[state=open]:![--tw-enter-scale:1] data-[state=closed]:![--tw-exit-scale:1] data-[state=open]:![--tw-enter-translate-y:0px] data-[state=closed]:![--tw-exit-translate-y:0px] data-[state=open]:![--tw-enter-translate-x:100%] data-[state=closed]:![--tw-exit-translate-x:100%] duration-300">
        <DialogTitle className="sr-only">New withdrawal</DialogTitle>
        <div className="flex flex-col gap-5 p-2 sm:p-4">
          <div className="flex flex-col gap-1">
            <Text heading="h2" className="text-xl font-semibold sm:text-2xl">
              New Withdrawal
            </Text>
            <Text className="text-sm text-primary-accent">
              Sends BTC back to the address you registered for deposits.
            </Text>
          </div>

          <BtcWithdrawalForm hideChrome onSubmitted={() => setOpen(false)} />

          <ul className="mt-1 flex flex-col gap-1 text-[11px] text-primary-accent">
            <li>• Withdrawals are paid out after the selected reserve is swept.</li>
            <li>• Use the reserve your last deposit was credited into.</li>
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  );
}
