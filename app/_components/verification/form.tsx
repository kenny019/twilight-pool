"use client";
import Button from "@/components/button";
import { Input } from "@/components/input";
import { Text } from "@/components/typography";
import { useToast } from "@/lib/hooks/useToast";
import { useWallet } from "@cosmos-kit/react-lite";
import { CopyIcon, HelpCircle } from "lucide-react";
import React from "react";
import { twilightproject } from "twilightjs";

const address = "1KFHE7w8BhaENAswwryaoccDb6qcT6DbYY";

const WalletVerificationForm = () => {
  const { toast } = useToast();

  const { mainWallet } = useWallet();

  return (
    <div className="space-y-6">
      <Text heading="h2" className="font-medium">
        Verify Ownership
      </Text>
      <div className="space-y-1">
        <Text asChild>
          <label
            className="text-primary-accent"
            htmlFor="input-btc-deposit-address"
          >
            BTC Wallet Address
          </label>
        </Text>
        <div className="relative flex items-center justify-center">
          <Input
            required
            id="input-btc-deposit-address"
            className="select-all"
            readOnly={true}
            defaultValue={address}
            onClick={(e) => {
              if (e.currentTarget) {
                e.currentTarget.select();
              }
            }}
          />
          <CopyIcon
            onClick={async () => {
              await navigator.clipboard.writeText(address);
              toast({
                title: "Copied to clipboard",
                description: "Bitcoin address was copied to your clipboard",
              });
            }}
            className="absolute right-4 my-auto h-4 w-4 cursor-pointer text-primary-accent hover:text-primary"
          />
        </div>
      </div>
      <div className="space-y-1">
        <div className="flex items-center space-x-2">
          <Text asChild>
            <label
              className="text-primary-accent"
              htmlFor="input-deposit-amount"
            >
              Deposit Amount*
            </label>
          </Text>

          <HelpCircle className="h-4 w-4 text-primary-accent hover:text-primary" />
        </div>
        <div className="relative flex items-center justify-center">
          <Input
            required
            id="input-deposit-amount"
            className="select-all"
            readOnly={true}
            defaultValue="0.00389181"
            onClick={(e) => {
              if (e.currentTarget) {
                e.currentTarget.select();
              }
            }}
          />
          <p className="absolute right-4 my-auto cursor-default font-ui text-xs">
            BTC
          </p>
        </div>
      </div>
      <Button className="w-full justify-center">Verify Deposit</Button>
    </div>
  );
};

export default WalletVerificationForm;
