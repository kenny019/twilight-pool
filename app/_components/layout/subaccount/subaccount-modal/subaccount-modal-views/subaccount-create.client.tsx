import { DialogTitle } from "@/components/dialog";
import { ChevronLeft } from "lucide-react";
import React, { useRef } from "react";
import { useSubaccountDialog } from "../subaccount-modal.client";
import { Text } from "@/components/typography";
import { Input } from "@/components/input";
import Button from "@/components/button";
import { z } from "zod";
import { useWallet } from "@cosmos-kit/react-lite";
import { createZkAccount } from "@/lib/twilight/zk";
import { useTwilightStore } from "@/lib/providers/store";
import { useSessionStore } from "@/lib/providers/session";
import { useToast } from "@/lib/hooks/useToast";

const SubaccountCreateView = () => {
  const { setView } = useSubaccountDialog();

  const zkAccounts = useTwilightStore((state) => state.zk.zkAccounts);
  const addZkAccount = useTwilightStore((state) => state.zk.addZkAccount);

  const privateKey = useSessionStore((state) => state.privateKey);

  const { mainWallet } = useWallet();
  const { toast } = useToast();

  const subaccountTagRef = useRef<HTMLInputElement>(null);

  async function SubmitCreateSubaccount(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const chainWallet = mainWallet?.getChainWallet("nyks");

    if (!chainWallet) {
      toast({
        variant: "error",
        title: "Wallet Not Connected",
        description: "Connect your wallet before creating a subaccount",
      });
      return;
    }

    const twilightAddress = chainWallet.address;

    if (!subaccountTagRef.current || !twilightAddress) {
      toast({
        variant: "error",
        title: "Wallet Not Connected",
        description: "Connect your wallet before creating a subaccount",
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

    const newZkAccount = await createZkAccount({
      tag: subaccountTag,
      signature: privateKey,
    });

    addZkAccount({
      ...newZkAccount,
      isOnChain: false,
      value: 0,
    });

    setView("list");

    toast({
      title: "Created Subaccount",
      description: `Successfully created ${subaccountTag}`,
    });
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
