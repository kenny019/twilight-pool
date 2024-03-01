import { DialogTitle } from "@/components/dialog";
import { ChevronLeft } from "lucide-react";
import React, { useRef } from "react";
import { useSubaccountDialog } from "../subaccount-modal.client";
import { Text } from "@/components/typography";
import { Input } from "@/components/input";
import Button from "@/components/button";
import { useTwilightStore } from "@/lib/providers/store";
import { useWallet } from "@cosmos-kit/react-lite";
import { useToast } from "@/lib/hooks/useToast";
import { z } from "zod";

const SubaccountEditView = () => {
  const { setView, selectedSubaccount } = useSubaccountDialog();

  const zkAccounts = useTwilightStore((state) => state.zk.zkAccounts);

  const updateZkAccount = useTwilightStore((state) => state.zk.updateZkAccount);
  const selectedZkAccount = zkAccounts.find(
    (account) => account.address === selectedSubaccount
  );

  const { mainWallet } = useWallet();
  const { toast } = useToast();

  const subaccountTagRef = useRef<HTMLInputElement>(null);

  async function SubmitEditSubaccount(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const chainWallet = mainWallet?.getChainWallet("nyks");

    if (!chainWallet || !selectedZkAccount) {
      toast({
        variant: "error",
        title: "Wallet Not Connected",
        description: "Connect your wallet before editing a subaccount",
      });
      return;
    }

    const twilightAddress = chainWallet.address;

    if (!subaccountTagRef.current || !twilightAddress) {
      toast({
        variant: "error",
        title: "Wallet Not Connected",
        description: "Connect your wallet before editing a subaccount",
      });
      return;
    }

    const subaccountTag = subaccountTagRef.current.value;

    const parseSubaccountTagRes = z
      .string()
      .min(1)
      .max(16)
      .safeParse(subaccountTag);

    if (parseSubaccountTagRes.success === false) {
      toast({
        variant: "error",
        title: "Invalid Tag",
        description: "Subaccount tag should be under 16 characters",
      });
      return;
    }

    updateZkAccount(selectedZkAccount.address, {
      ...selectedZkAccount,
      tag: subaccountTag,
    });

    setView("list");

    toast({
      title: "Edited Subaccount",
      description: `Successfully edited ${subaccountTag}`,
    });
  }

  if (!selectedZkAccount) {
    return <></>;
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
        <span>Edit Subaccount</span>
      </DialogTitle>
      <form onSubmit={SubmitEditSubaccount} className="space-y-4">
        <div className="space-y-1">
          <Text className="text-sm text-primary-accent" asChild>
            <label htmlFor="subaccount-tag-input">Subaccount Name</label>
          </Text>
          <Input
            id="subaccount-tag-input"
            placeholder={"Subaccount Tag"}
            defaultValue={selectedZkAccount.tag}
            ref={subaccountTagRef}
            value={subaccountTagRef.current?.value}
          />
        </div>
        <Button type="submit" size="small">
          Edit
        </Button>
      </form>
    </>
  );
};

export default SubaccountEditView;
