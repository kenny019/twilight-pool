"use client";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/select";
import { Text } from "@/components/typography";
import { useAccountStore } from "@/lib/state/store";
import React, { useState } from "react";

type Props = {
  children: React.ReactNode;
};

const LendDialog = ({ children }: Props) => {
  const zkAccounts = useAccountStore((state) => state.zk.zkAccounts);

  const [selectedAccountIndex, setSelectedAccountIndex] = useState(0);

  function submitForm(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
  }

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="left-auto right-0 min-h-screen max-w-2xl translate-x-0 rounded-none border-r-0">
        <DialogTitle>Lend</DialogTitle>
        <form onSubmit={submitForm}>
          <div className="flex flex-row justify-between">
            <div className="space-y-1">
              <Text className="text-xs text-primary-accent" asChild>
                <label htmlFor="dropdown-trading-account-from">
                  Account from
                </label>
              </Text>

              <Select
                defaultValue={selectedAccountIndex.toString()}
                value={selectedAccountIndex.toString()}
                onValueChange={(val) => setSelectedAccountIndex(parseInt(val))}
              >
                <SelectTrigger
                  id="dropdown-account-lend-from"
                  className="w-[180px]"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {zkAccounts.map((subAccount, index) => {
                    return (
                      <SelectItem
                        value={index.toString()}
                        key={subAccount.address}
                      >
                        {subAccount.tag === "main"
                          ? "Trading Account"
                          : subAccount.tag}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default LendDialog;
