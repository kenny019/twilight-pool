"use client";
import ConnectWallet from "@/app/_components/layout/connect-wallet.client";
import Button from "@/components/button";
import { Input } from "@/components/input";
import { generateSignMessage } from "@/lib/twilight/chain";
import { useWallet } from "@cosmos-kit/react-lite";
import React, { useRef } from "react";

const Page = () => {
  const { mainWallet } = useWallet();

  const ref = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-3">
      <ConnectWallet />
      <div className="space-y-1">
        <label>Signature message</label>
        <Input ref={ref} />
      </div>
      <Button
        onClick={async () => {
          const chainWallet = mainWallet?.getChainWallet("nyks");

          if (!chainWallet) {
            console.error("no chainWallet");
            return;
          }

          const twilightAddress = chainWallet.address;

          if (!twilightAddress) {
            console.error("no twilightAddress");
            return;
          }
          const [key, signature] = await generateSignMessage(
            chainWallet,
            twilightAddress,
            ref.current?.value || "hello"
          );

          const outputObj = {
            address: twilightAddress,
            key,
            signature,
          };

          console.log(JSON.stringify(outputObj));
        }}
      >
        Generate Signature
      </Button>
    </div>
  );
};

export default Page;
