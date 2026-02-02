"use client";
import Button from "@/components/button";
import { Input } from "@/components/input";
import { Text } from "@/components/typography";
import { BtcReserveStruct, getReserveData } from "@/lib/api/rest";
import { useToast } from "@/lib/hooks/useToast";
import { useTwilight } from "@/lib/providers/twilight";
import { WalletStatus } from "@cosmos-kit/core";
import { useWallet } from "@cosmos-kit/react-lite";
import { HelpCircle } from "lucide-react";
import React, { useEffect, useState } from "react";

type Props = {
  btcDepositAddress: string;
  btcSatoshiTestAmount: string;
  onSuccess: () => void;
};

const VerificationStep = ({
  btcDepositAddress,
  btcSatoshiTestAmount,
  onSuccess,
}: Props) => {
  const { toast } = useToast();
  const { status } = useWallet();

  const isWalletConnected = status === WalletStatus.Connected;

  const { checkBTCRegistration, hasConfirmedBTC } = useTwilight();

  const [btcReserves, setBtcReserves] = useState<BtcReserveStruct[]>([]);

  useEffect(() => {
    async function populateReserveData() {
      const { success, data } = await getReserveData();

      if (!success) return;

      setBtcReserves(data.BtcReserves);
    }

    populateReserveData();
  }, []);

  return (
    <div className="space-y-6">
      <Text heading="h2" className="text-2xl font-medium sm:text-3xl">
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
            readOnly={true}
            defaultValue={btcDepositAddress}
          />
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
      </div>

      <Button
        disabled={!isWalletConnected || !btcDepositAddress}
        onClick={() => {
          if (!isWalletConnected) {
            toast({
              variant: "error",
              title: "Wallet not connected",
              description: "Please connect your wallet to verify your deposit.",
            });
            return;
          }

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
            description: "Deposit verified successfully!",
          });

          onSuccess();
        }}
        className="w-full justify-center"
      >
        {!isWalletConnected
          ? "Connect Wallet to Verify"
          : !btcDepositAddress
            ? "Register BTC Address First"
            : "Verify Deposit"}
      </Button>
      <div className="max-h-[250px] overflow-auto rounded-md border p-2">
        <table className="w-full caption-bottom text-sm">
          <thead className="[&_tr]:border-b">
            <tr className="hover:bg-muted/50 data-[state=selected]:bg-muted border-b transition-colors">
              <th className="h-10 px-2 text-left align-middle font-medium">
                Reserve Address
              </th>
              <th className="h-10 px-2 text-left align-middle font-medium">
                Reserve ID
              </th>
            </tr>
          </thead>
          <tbody className="[&_tr:last-child]:border-0">
            {btcReserves.map((reserve) => (
              <tr
                key={reserve.ReserveId}
                className="hover:bg-muted/50 data-[state=selected]:bg-muted border-b transition-colors"
              >
                <td className="p-2 align-middle">{reserve.ReserveAddress}</td>
                <td className="p-2 align-middle">{reserve.ReserveId}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default VerificationStep;
