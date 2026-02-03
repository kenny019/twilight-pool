"use client";
import React, { useRef, useState } from "react";
import Button from "@/components/button";
import { Input, PopoverInput } from "@/components/input";
import { Text } from "@/components/typography";
import { useToast } from "@/lib/hooks/useToast";
import { WalletStatus } from "@cosmos-kit/core";
import { useWallet } from "@cosmos-kit/react-lite";
import { z } from "zod";
import Long from "long";
import { Loader2 } from "lucide-react";
import BTC, { BTCDenoms } from "@/lib/twilight/denoms";
import Big from "big.js";
import { btcAddressSchema } from "@/lib/types";
import { twilightproject } from "twilightjs";

type Props = {
  onSuccess: (address: string, amount: string) => void;
  btcAddress?: string;
  isConfirmed?: boolean;
};

const RegistrationStep = ({ onSuccess, btcAddress, isConfirmed }: Props) => {
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(false);
  const [depositDenom, setDepositDenom] = useState<string>("BTC");
  const depositRef = useRef<HTMLInputElement>(null);

  const { mainWallet, status } = useWallet();

  const isWalletConnected = status === WalletStatus.Connected;

  async function submitForm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);

    if (!mainWallet) {
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
      btcAddressSchema.safeParse(formDepositAddress);

    const parseDepositValueRes = z.number().safeParse(formDepositValue);

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

    const deposit = new BTC(depositDenom as BTCDenoms, Big(depositValue));
    const depositSats = deposit.convert("sats").toNumber();

    // Skip broadcast if already confirmed, just pass new amount
    if (isConfirmed) {
      setIsLoading(false);
      onSuccess(depositAddress, depositSats.toString());
      return;
    }

    const stargateClient = await chainWallet.getSigningStargateClient();

    const { registerBtcDepositAddress } =
      twilightproject.nyks.bridge.MessageComposer.withTypeUrl;

    const msg = registerBtcDepositAddress({
      btcDepositAddress: depositAddress,
      twilightAddress: twilightDepositAddress,
      btcSatoshiTestAmount: Long.fromNumber(depositSats),
      twilightStakingAmount: Long.fromNumber(10000),
    });

    try {
      await stargateClient.signAndBroadcast(twilightDepositAddress, [msg], "auto");

      toast({
        title: "Submitting Bitcoin address",
        description:
          "Please do not close this page while your Bitcoin address is being submitted...",
      });

      setTimeout(() => {
        setIsLoading(false);
        toast({
          title: "Submitted Bitcoin address",
          description: "Your Bitcoin address has been successfully submitted",
        });

        onSuccess(depositAddress, depositSats.toString());
      }, 1000);
    } catch (err) {
      setIsLoading(false);
      const shouldInitialize =
        typeof err === "string"
          ? (err as string).includes("does not exist on chain")
          : false;
      toast({
        title: "Error submitting address",
        description: shouldInitialize
          ? "Your twilight address does not exist on the chain, send some tokens there and try again"
          : "There was a problem with submitting your Bitcoin address, please try again later",
        variant: "error",
      });
    }
  }

  return (
    <form method="get" onSubmit={submitForm} className="space-y-6">
      <Text heading="h2" className="text-2xl font-medium sm:text-3xl">
        Enter Deposit Details
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
          defaultValue={btcAddress}
          readOnly={!!btcAddress}
        />
      </div>
      <div className="space-y-1">
        <Text asChild>
          <label className="text-primary-accent" htmlFor="input-btc-amount">
            Deposit Amount
          </label>
        </Text>
        <PopoverInput
          id="input-btc-amount"
          name="depositValue"
          onClickPopover={(e) => {
            e.preventDefault();
            if (!depositRef.current?.value) return;

            const toDenom = e.currentTarget.value as BTCDenoms;

            const currentValue = new BTC(
              depositDenom as BTCDenoms,
              Big(depositRef.current.value)
            );

            depositRef.current.value = currentValue.convert(toDenom).toString();
          }}
          type="number"
          step="any"
          placeholder="1.00"
          options={["BTC", "mBTC", "sats"]}
          setSelected={setDepositDenom}
          selected={depositDenom}
          ref={depositRef}
        />
      </div>

      <Button
        disabled={!isWalletConnected || isLoading}
        className="w-full bg-primary text-background hover:bg-primary/90"
        type="submit"
      >
        {isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : !isWalletConnected ? (
          "Connect Wallet to Register"
        ) : isConfirmed ? (
          "Continue"
        ) : (
          "Deposit"
        )}
      </Button>
    </form>
  );
};

export default RegistrationStep;
