import { DialogTitle } from "@/components/dialog";
import { ChevronLeft } from "lucide-react";
import React, { useRef } from "react";
import { useSubaccountDialog } from "../subaccount-modal.client";
import { Text } from "@/components/typography";
import { Input } from "@/components/input";
import { useSubaccount } from "@/lib/providers/subaccounts";
import Button from "@/components/button";
import { useTwilight } from "@/lib/providers/singleton";
import { z } from "zod";
import { createSubaccount } from "@/lib/twilight/chain";
import { useWallet } from "@cosmos-kit/react-lite";

const SubaccountCreateView = () => {
  const { setView } = useSubaccountDialog();

  const { subAccounts, addSubaccount } = useSubaccount();

  const { mainWallet } = useWallet();
  const { quisPrivateKey } = useTwilight();

  const subaccountTagRef = useRef<HTMLInputElement>(null);

  async function SubmitCreateSubaccount(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const chainWallet = mainWallet?.getChainWallet("nyks");

    if (!chainWallet) {
      // todo: add toast
      return;
    }

    const twilightAddress = chainWallet.address;

    if (!subaccountTagRef.current || !twilightAddress) {
      // todo: add toast
      return;
    }

    const subaccountTag = subaccountTagRef.current.value;

    const parseSubaccountTagRes = z
      .string()
      .min(1)
      .max(16)
      .safeParse(subaccountTag);
    if (parseSubaccountTagRes.success === false) {
      // todo: add toast
      return;
    }

    const subaccountAddress = await createSubaccount(quisPrivateKey);

    const newSubaccount = {
      tag: subaccountTag,
      address: subaccountAddress,
      value: 0,
    };

    addSubaccount(twilightAddress, newSubaccount);
    setView("list");

    // todo: add toast
  }

  return (
    <>
      <DialogTitle className="flex flex-row items-center space-x-4">
        <ChevronLeft
          onClick={(e) => {
            e.preventDefault();

            setView("list");
          }}
          className="h-4 w-4 cursor-pointer hover:text-primary-accent"
        />
        <span>Create Subaccount</span>
      </DialogTitle>
      <form onSubmit={SubmitCreateSubaccount} className="space-y-4">
        <div className="space-y-1">
          <Text className="text-sm text-primary-accent" asChild>
            <label htmlFor="subaccount-tag-input">Subaccount Name</label>
          </Text>
          <Input
            id="subaccount-tag-input"
            placeholder={`Subaccount ${subAccounts.length + 1}`}
            defaultValue={`Subaccount ${subAccounts.length + 1}`}
            ref={subaccountTagRef}
            value={subaccountTagRef.current?.value}
          />
        </div>
        <Button type="submit" size="small">
          Create
        </Button>
      </form>
    </>
  );
};

export default SubaccountCreateView;
