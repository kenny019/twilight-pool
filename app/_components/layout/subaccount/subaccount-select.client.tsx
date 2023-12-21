"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/select";
import { useSubaccount } from "@/lib/providers/subaccounts";
import { useWallet } from "@cosmos-kit/react-lite";
import React, { useEffect, useState } from "react";
import SubaccountModal from "./subaccount-modal/subaccount-modal.client";
import { SubaccountStruct } from "@/lib/types";

function representSubaccountTag(
  selectedSubaccount: number,
  subAccounts: SubaccountStruct[]
) {
  if (selectedSubaccount < 0) {
    return selectedSubaccount < -1
      ? selectedSubaccount === -2
        ? "Trading Account"
        : ""
      : "Manage Subacconuts";
  }

  return `${subAccounts[selectedSubaccount].tag}`;
}

const SubaccountSelect = () => {
  const { subAccounts, selectedSubaccount, setSelectedSubaccount } =
    useSubaccount();

  const [openSubaccountModal, setOpenSubaccountModal] = useState(false);

  const { status } = useWallet();

  function useResetSelectedSubaccount() {
    useEffect(() => {
      // todo: replace magic numbers enum
      if (status === "Connected" && selectedSubaccount === -3) {
        setSelectedSubaccount(-2);
      }

      if (status === "Disconnected" && selectedSubaccount > -3) {
        // note: -3 represents no account selected (disconnected state)
        setSelectedSubaccount(-3);
      }
    }, [status]);
  }

  useResetSelectedSubaccount();

  return (
    <>
      <SubaccountModal
        setOpen={setOpenSubaccountModal}
        open={openSubaccountModal}
      />

      <Select
        defaultValue={"main"}
        onValueChange={(newSubaccountIndexStr) => {
          const newSubaccountIndex = parseInt(newSubaccountIndexStr);
          // note: -1 represents manage subaccount lol
          // -2 represents trading account
          // -3 represents disconnected state
          // limitation cause we parseint maybe someone can fix it
          if (newSubaccountIndex === -1) {
            // open modal to create subaccount
            setOpenSubaccountModal(true);
            return;
          }

          setSelectedSubaccount(newSubaccountIndex);
        }}
        value={selectedSubaccount.toString()}
        disabled={status !== "Connected"}
      >
        <SelectTrigger id="select-subaccount-quick" className="w-[160px]">
          <SelectValue asChild>
            <p>{representSubaccountTag(selectedSubaccount, subAccounts)}</p>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {subAccounts.length < 1 ? (
            // todo: should block adding subaccounts into current value
            <>
              <SelectItem value={"-2"}>Trading Account</SelectItem>
              <SelectItem value={"-1"}>Manage Subaccounts</SelectItem>
            </>
          ) : (
            <>
              <SelectItem value={"-2"}>Trading Account</SelectItem>
              {subAccounts.map((subAccount, index) => {
                // todo: replace key tag with actual address
                return (
                  <SelectItem key={index} value={index.toString()}>
                    {subAccount.tag}
                  </SelectItem>
                );
              })}
              <SelectItem value={"-1"}>Manage Subaccounts</SelectItem>
            </>
          )}
        </SelectContent>
      </Select>
    </>
  );
};

export default SubaccountSelect;
