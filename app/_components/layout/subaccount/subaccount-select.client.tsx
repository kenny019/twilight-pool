"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/select";
import { useWallet } from "@cosmos-kit/react-lite";
import React, { useState } from "react";
import SubaccountModal from "./subaccount-modal/subaccount-modal.client";
import ExchangeResource from "@/components/exchange-resource";
import { useTwilight } from "@/lib/providers/twilight";
import { ChevronDown } from "lucide-react";
import { ZkAccount } from "@/lib/types";
import { ZK_ACCOUNT_INDEX } from "@/lib/constants";
import { useAccountStore } from "@/lib/state/store";

function getSelectMenuText(selectedZkAccount: number, zkAccounts: ZkAccount[]) {
  if (selectedZkAccount === ZK_ACCOUNT_INDEX.DISCONNECTED) {
    return "";
  }

  if (selectedZkAccount === ZK_ACCOUNT_INDEX.MAIN) {
    return "Trading Account";
  }

  return zkAccounts[selectedZkAccount].tag;
}

const SubaccountSelect = () => {
  const [openSubaccountModal, setOpenSubaccountModal] = useState(false);

  const { status } = useWallet();

  const { hasRegisteredBTC, hasConfirmedBTC } = useTwilight();

  const zkAccounts = useAccountStore((state) => state.zk.zkAccounts);

  const selectedZkAccount =
    useAccountStore((state) => state.zk.selectedZkAccount) ||
    ZK_ACCOUNT_INDEX.MAIN;

  const updateSelectedZkAccount = useAccountStore(
    (state) => state.zk.updateSelectedZkccount
  );

  if (!hasRegisteredBTC || !hasConfirmedBTC) {
    return (
      <ExchangeResource>
        <button className="flex h-10 w-[160px] items-center justify-between rounded-md border bg-background px-3 py-2 text-sm ring-primary transition-colors placeholder:text-primary-accent focus:outline-none focus:ring-1 disabled:cursor-not-allowed disabled:opacity-50">
          <p>Trading Account</p> <ChevronDown className="h-4 w-4 opacity-50" />
        </button>
      </ExchangeResource>
    );
  }

  return (
    <>
      <SubaccountModal
        setOpen={setOpenSubaccountModal}
        open={openSubaccountModal}
      />
      <Select
        defaultValue={ZK_ACCOUNT_INDEX.DISCONNECTED.toString()}
        onValueChange={(newSubaccountIndexStr) => {
          const newSubaccountIndex = parseInt(newSubaccountIndexStr);
          // note: -1 represents manage subaccount
          // -2 represents trading account
          // -3 represents disconnected state
          // limitation cause we parseint maybe someone can fix it
          if (newSubaccountIndex === ZK_ACCOUNT_INDEX.MANAGE_ACCOUNT) {
            // open modal to create subaccount
            setOpenSubaccountModal(true);
            return;
          }

          updateSelectedZkAccount(newSubaccountIndex);
        }}
        value={selectedZkAccount.toString()}
        disabled={status !== "Connected"}
      >
        <SelectTrigger id="select-subaccount-quick" className="w-[160px]">
          <SelectValue asChild>
            <p>{getSelectMenuText(selectedZkAccount, zkAccounts)}</p>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {zkAccounts.length < 1 ? (
            // todo: should block adding subaccounts into current value
            <>
              <SelectItem value={ZK_ACCOUNT_INDEX.MAIN.toString()}>
                Trading Account
              </SelectItem>
              <SelectItem value={ZK_ACCOUNT_INDEX.MANAGE_ACCOUNT.toString()}>
                Manage Subaccounts
              </SelectItem>
            </>
          ) : (
            <>
              <SelectItem value={ZK_ACCOUNT_INDEX.MAIN.toString()}>
                Trading Account
              </SelectItem>
              {zkAccounts.map((account, index) => {
                if (index === ZK_ACCOUNT_INDEX.MAIN) {
                  // todo: replace key tag with actual address
                  return null;
                }

                return (
                  <SelectItem key={index} value={index.toString()}>
                    {account.tag}
                  </SelectItem>
                );
              })}
              <SelectItem value={ZK_ACCOUNT_INDEX.MANAGE_ACCOUNT.toString()}>
                Manage Subaccounts
              </SelectItem>
            </>
          )}
        </SelectContent>
      </Select>
    </>
  );
};

export default SubaccountSelect;
