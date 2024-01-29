import Button from "@/components/button";
import { DialogTitle } from "@/components/dialog";
import { Separator } from "@/components/seperator";
import { Text } from "@/components/typography";
import cn from "@/lib/cn";
import { useTwilight } from "@/lib/providers/singleton";
import { useSubaccount } from "@/lib/providers/subaccounts";
import { SubaccountStruct } from "@/lib/types";
import React from "react";
import { useSubaccountDialog } from "../subaccount-modal.client";
import { Plus } from "lucide-react";
import BTC from "@/lib/twilight/denoms";
import Big from "big.js";

type AccountRowProps = {
  account: SubaccountStruct;
  accountIndex: number;
  className?: string;
};

const SubaccountListView = () => {
  const { subAccounts, selectedSubaccount, setSelectedSubaccount } =
    useSubaccount();

  const { mainTradingAccount } = useTwilight();

  const { setView } = useSubaccountDialog();

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
                setSelectedSubaccount(accountIndex);
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
              selectedSubaccount === -2 ? "border-theme" : "border-outline"
            )}
            account={{
              address: mainTradingAccount?.address || "",
              tag: "Trading Account",
            }}
            accountIndex={-2}
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
          {subAccounts.map((subAccount, index) => (
            // todo: change.tag to actual address
            <AccountRow
              className={cn(
                selectedSubaccount === index ? "border-theme" : "border-outline"
              )}
              key={subAccount.tag}
              accountIndex={index}
              account={subAccount}
            />
          ))}
        </div>
      </div>
    </>
  );
};

export default SubaccountListView;
