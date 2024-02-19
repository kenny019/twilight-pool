import Button from "@/components/button";
import { DialogTitle } from "@/components/dialog";
import { Separator } from "@/components/seperator";
import { Text } from "@/components/typography";
import cn from "@/lib/cn";
import React from "react";
import { useSubaccountDialog } from "../subaccount-modal.client";
import { Plus } from "lucide-react";
import BTC from "@/lib/twilight/denoms";
import Big from "big.js";
import { ZkAccount } from "@/lib/types";
import { ZK_ACCOUNT_INDEX } from "@/lib/constants";
import { useTwilightStore } from "@/lib/providers/store";

type AccountRowProps = {
  account: ZkAccount;
  accountIndex: number;
  className?: string;
};

const SubaccountListView = () => {
  const { setView } = useSubaccountDialog();

  const zkAccounts = useTwilightStore((state) => state.zk.zkAccounts);
  const selectedZkAccount = useTwilightStore(
    (state) => state.zk.selectedZkAccount
  );

  console.log(
    "zk",
    useTwilightStore((state) => state.zk)
  );
  const updateSelectedZkAccount = useTwilightStore(
    (state) => state.zk.updateSelectedZkAccount
  );

  function AccountRow({ accountIndex, account, className }: AccountRowProps) {
    const subAccountBTCValue = new BTC("sats", Big(account.value || 0))
      .convert("BTC")
      .toFixed(8); // todo: add method to BTC class for string representation

    return (
      <div
        className={cn(
          "flex rounded-md border p-2 transition-colors",
          className
        )}
      >
        <div className="flex w-full flex-row items-center justify-between">
          <div className="space-y-1">
            <Text>{account.tag}</Text>
            <Text className="text-xs text-primary-accent">
              {subAccountBTCValue} BTC
            </Text>
          </div>
          <div className="flex flex-row space-x-2">
            <Button variant="link">Edit</Button>
            <Button
              variant="link"
              onClick={(e) => {
                e.preventDefault();
                // todo: add toast
                updateSelectedZkAccount(accountIndex);
              }}
            >
              Select
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <DialogTitle>Accounts</DialogTitle>
      <div className="space-y-4">
        <div className="space-y-1">
          <AccountRow
            className={cn(
              selectedZkAccount === ZK_ACCOUNT_INDEX.MAIN
                ? "border-theme"
                : "border-outline"
            )}
            account={zkAccounts[0]}
            accountIndex={ZK_ACCOUNT_INDEX.MAIN}
          />
        </div>
        <div className="space-y-2">
          <div className="flex flex-row items-center justify-between">
            <Text>Subaccounts</Text>

            <div className="flex flex-row items-center space-x-2">
              <Button
                onClick={(e) => {
                  e.preventDefault();
                  setView("create");
                }}
                variant="ui"
                className="px-2 py-1 text-sm"
                size="icon"
              >
                New <Plus className="h-2 w-2" />
              </Button>
              <Text>Search</Text>
            </div>
          </div>
          <Separator className="mt-2" />
        </div>
        <div className="flex w-full flex-col space-y-2">
          {/* todo: add pagination */}
          {zkAccounts.map((subAccount, index) => {
            if (index === ZK_ACCOUNT_INDEX.MAIN) {
              return null;
            }

            return (
              <AccountRow
                className={cn(
                  selectedZkAccount === index
                    ? "border-theme"
                    : "border-outline"
                )}
                key={subAccount.tag}
                accountIndex={index}
                account={subAccount}
              />
            );
          })}
        </div>
      </div>
    </>
  );
};

export default SubaccountListView;
