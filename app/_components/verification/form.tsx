"use client";
import Button from "@/components/button";
import { Input } from "@/components/input";
import { Text } from "@/components/typography";
import { useToast } from "@/lib/hooks/useToast";
import { useTwilight } from "@/lib/providers/twilight";
import { CopyIcon, HelpCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import React from "react";

type Props = {
  btcDepositAddress: string;
  btcSatoshiTestAmount: string;
};

const WalletVerificationForm = ({
  btcDepositAddress,
  btcSatoshiTestAmount,
}: Props) => {
  const { toast } = useToast();
  const router = useRouter();

  const { checkBTCRegistration, hasConfirmedBTC } = useTwilight();

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
            id="input-btc-deposit-address"
            className="select-all"
            readOnly={true}
            defaultValue={btcDepositAddress}
            onClick={(e) => {
              if (e.currentTarget) {
                e.currentTarget.select();
              }
            }}
          />
          <CopyIcon
            onClick={async () => {
              await navigator.clipboard.writeText(btcDepositAddress);
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
            defaultValue={btcSatoshiTestAmount}
            onClick={(e) => {
              if (e.currentTarget) {
                e.currentTarget.select();
              }
            }}
          />
          <p className="absolute right-4 my-auto cursor-default font-ui text-xs">
            SATS
          </p>
        </div>
      </div>
      <Button
        onClick={() => {
          checkBTCRegistration();

          if (!hasConfirmedBTC) {
            toast({
              variant: "error",
              title: "Error",
              description: "Deposit has not been detected.",
            });
            return;
          }

          toast({
            title: "Success",
            description: "Deposit is successful, redirecting now...",
          });

          setTimeout(() => {
            router.replace("/");
          }, 2000);
        }}
        className="w-full justify-center"
      >
        Verify Deposit
      </Button>
    </div>
  );
};

export default WalletVerificationForm;
