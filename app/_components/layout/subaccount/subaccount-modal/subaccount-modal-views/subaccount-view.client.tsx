import { DialogTitle } from "@/components/dialog";
import { ChevronLeft } from "lucide-react";
import React, { useRef } from "react";
import { useSubaccountDialog } from "../subaccount-modal.client";
import { Text } from "@/components/typography";
import { Input } from "@/components/input";
import Button from "@/components/button";
import { useTwilight } from "@/lib/providers/twilight";
import { z } from "zod";
import { useWallet } from "@cosmos-kit/react-lite";
import { createZkAccount } from "@/lib/twilight/zk";
import { useAccountStore } from "@/lib/state/store";

const SubaccountCreateView = () => {
  const { setView } = useSubaccountDialog();

  const zkAccounts = useAccountStore((state) => state.zk.zkAccounts);

  const addZkAccount = useAccountStore((state) => state.zk.addZkAccount);

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

    const newZkAccount = await createZkAccount({
      tag: subaccountTag,
      signature: quisPrivateKey,
    });

    addZkAccount({
      ...newZkAccount,
      isOnChain: false,
      value: 0,
    });

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
            placeholder={`Subaccount ${zkAccounts.length}`}
            defaultValue={`Subaccount ${zkAccounts.length}`}
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
