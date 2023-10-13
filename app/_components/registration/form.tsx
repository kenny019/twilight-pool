"use client";
import Button from "@/components/button";
import { Input } from "@/components/input";
import { Text } from "@/components/typography";
import { useToast } from "@/lib/hooks/useToast";
import { useWallet } from "@cosmos-kit/react-lite";
import { useRouter } from "next/navigation";
import React, { useState } from "react";
import { twilightproject } from "twilightjs";
import { z } from "zod";
import Long from "long";
import { Loader2 } from "lucide-react";

const depositAddressSchema = z
  .string()
  .regex(/^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,39}$/g);

const depositValueSchema = z.number();

const WalletRegistrationForm = () => {
  const { toast } = useToast();
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(false);

  const { mainWallet } = useWallet();

  async function submitForm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);

    if (!mainWallet) {
      console.error("no mainWallet");
      setIsLoading(false);
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
    const formDepositValue = parseFloat(formData.get("depositValue") as string);

    const parseDepositAddressRes =
      depositAddressSchema.safeParse(formDepositAddress);

    const parseDepositValueRes = depositValueSchema.safeParse(formDepositValue);

    const twilightDepositAddress = chainWallet.address;
    if (!twilightDepositAddress) {
      setIsLoading(false);
      return toast({
        title: "Invalid Twilight address",
        description:
          "Unable to detect Twilight address, try to reconnect your wallet.",
        variant: "error",
      });
    }

    if (!parseDepositAddressRes.success) {
      setIsLoading(false);
      return toast({
        title: "Invalid Bitcoin address",
        description: "Please enter a valid Bitcoin address",
        variant: "error",
      });
    }

    if (!parseDepositValueRes.success) {
      setIsLoading(false);
      return toast({
        title: "Invalid deposit value",
        description: "Deposit value needs to be a number",
        variant: "error",
      });
    }

    const depositValue = parseDepositValueRes.data;
    const depositAddress = parseDepositAddressRes.data;

    const offlineSigner = chainWallet.offlineSigner;

    console.log(offlineSigner);

    const stargateClient = await chainWallet.getSigningStargateClient();

    const { registerBtcDepositAddress } =
      twilightproject.nyks.bridge.MessageComposer.withTypeUrl;

    console.log(twilightDepositAddress);
    const msg = registerBtcDepositAddress({
      btcDepositAddress: depositAddress,
      twilightAddress: twilightDepositAddress,
      btcSatoshiTestAmount: Long.fromNumber(10000),
      twilightStakingAmount: Long.fromNumber(10000),
    });

    try {
      await stargateClient.signAndBroadcast(twilightDepositAddress, [msg], 100);

      setIsLoading(false);

      toast({
        title: "Submitted Bitcoin address",
        description: "Your Bitcoin address has been successfully submitted",
      });
      router.push("/verification");
    } catch (err) {
      setIsLoading(false);
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
      <div className="space-y-1">
        <Text asChild>
          <label className="text-primary-accent" htmlFor="input-btc-amount">
            Deposit Amount
          </label>
        </Text>
        <Input
          required
          name="depositValue"
          id="input-btc-amount"
          placeholder="0.1"
        />
      </div>
      <Button type="submit" className="w-full justify-center">
        {isLoading ? <Loader2 className="animate-spin" /> : "Register"}
      </Button>
    </form>
  );
};

export default WalletRegistrationForm;
