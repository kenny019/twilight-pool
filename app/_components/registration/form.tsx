"use client";
import Button from "@/components/button";
import { Input } from "@/components/input";
import { Text } from "@/components/typography";
import { useToast } from "@/lib/hooks/useToast";
import { useWallet } from "@cosmos-kit/react-lite";
import { useRouter } from "next/navigation";
import React from "react";
import { twilightproject } from "twilightjs";
import { z } from "zod";

const depositAddressSchema = z
  .string()
  .regex(/^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,39}$/g);

const WalletRegistrationForm = () => {
  const { toast } = useToast();
  const router = useRouter();

  const { mainWallet } = useWallet();

  async function submitForm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!mainWallet) {
      console.log("no mainWallet");
      return toast({
        title: "No wallet",
        description: "Please connect your wallet before registration",
        variant: "error",
      });
    }

    const chainWallet = mainWallet.getChainWallet("nyks");

    if (!chainWallet) return;

    const form = event.currentTarget;
    const formData = new FormData(form);

    const formDepositAddress = formData.get("depositAddress");
    const parseDepositAddressRes =
      depositAddressSchema.safeParse(formDepositAddress);

    const twilightDepositAddress = chainWallet.address;
    if (!twilightDepositAddress) {
      return toast({
        title: "Invalid Twilight address",
        description:
          "Unable to detect Twilight address, try to reconnect your wallet.",
        variant: "error",
      });
    }

    if (!parseDepositAddressRes.success) {
      return toast({
        title: "Invalid Bitcoin address",
        description: "Please enter a valid Bitcoin address",
        variant: "error",
      });
    }

    const depositAddress = parseDepositAddressRes.data;

    const stargateClient = await chainWallet.getSigningStargateClient();
    const { registerBtcDepositAddress } =
      twilightproject.nyks.bridge.MessageComposer.withTypeUrl;

    const msg = registerBtcDepositAddress({
      depositAddress: depositAddress,
      twilightDepositAddress,
    });

    try {
      await stargateClient.signAndBroadcast(twilightDepositAddress, [msg], 100);

      toast({
        title: "Submitted Bitcoin address",
        description: "Your Bitcoin address has been successfully submitted",
      });
      router.push("/verification");
    } catch (err) {
      console.error(err);
      toast({
        title: "Error submitting address",
        description:
          "There was a problem with submitting your Bitcoin address, please try again later",
        variant: "error",
      });
    }
  }

  return (
    <form method="get" onSubmit={submitForm} className="space-y-6">
      <Text heading="h2" className="font-medium">
        Register Bitcoin Address
      </Text>
      <div className="space-y-1">
        <Text asChild>
          <label className="text-primary-accent" htmlFor="input-btc-address">
            BTC Wallet Address
          </label>
        </Text>
        <Input
          required
          name="depositAddress"
          id="input-btc-address"
          placeholder="..."
        />
      </div>
      <Button type="submit" className="w-full justify-center">
        Register
      </Button>
    </form>
  );
};

export default WalletRegistrationForm;
