"use client";
import Button from "@/components/button";
import { Input } from "@/components/input";
import { Text } from "@/components/typography";
import { useWallet } from "@cosmos-kit/react-lite";
import React, { useState } from "react";
import { twilightproject } from "twilightjs";
import { z } from "zod";

const depositAddressSchema = z.string();

const WalletRegistrationForm = () => {
  const { mainWallet } = useWallet();

  // const [depositAddressError, setDepositAddressError] = useState(false);

  async function submitForm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!mainWallet) return;

    const chainWallet = mainWallet.getChainWallet("nyks");

    if (!chainWallet) return;

    const form = event.currentTarget;
    const formData = new FormData(form);

    const formDepositAddress = formData.get("depositAddress");
    const parseDepositAddressRes =
      depositAddressSchema.safeParse(formDepositAddress);

    const twilightDepositAddress = chainWallet.address;

    if (!parseDepositAddressRes.success || !twilightDepositAddress) {
      // setDepositAddressError(true)
      return;
    }

    const depositAddress = parseDepositAddressRes.data;

    const stargateClient = await chainWallet.getSigningStargateClient();
    const { registerBtcDepositAddress } =
      twilightproject.nyks.bridge.MessageComposer.withTypeUrl;

    const msg = registerBtcDepositAddress({
      depositAddress: depositAddress,
      twilightDepositAddress,
    });

    await stargateClient.signAndBroadcast(twilightDepositAddress, [msg], 100);
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
