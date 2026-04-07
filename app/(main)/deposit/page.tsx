"use client";
import React, { useEffect, useMemo } from "react";
import DepositFlow, { DepositStep } from "@/app/_components/deposit/deposit-flow";
import { Text } from "@/components/typography";
import { useToast } from "@/lib/hooks/useToast";
import useVerifyStatus from "@/lib/hooks/useVerifyStatus";
import useGetRegisteredBTCAddress from "@/lib/hooks/useGetRegisteredBtcAddress";
import { WalletStatus } from "@cosmos-kit/core";
import { useWallet } from "@/lib/mock/useMockableWallet";
import { AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";

const Page = () => {
  const MANDATORY_KYC = process.env.NEXT_PUBLIC_MANDATORY_KYC === "true";
  const { isVerified } = useVerifyStatus();
  const { toast } = useToast();
  const router = useRouter();
  const { mainWallet, status } = useWallet();

  const chainWallet = mainWallet?.getChainWallet("nyks");
  const isWalletConnected = status === WalletStatus.Connected;
  const twilightAddress = chainWallet?.address;

  const registeredBtcResponse = useGetRegisteredBTCAddress(
    twilightAddress || "",
  );

  useEffect(() => {
    if (MANDATORY_KYC && isVerified !== undefined && isVerified === false) {
      toast({
        title: "Verification required",
        description:
          "Please verify your passport to continue with registration",
      });

      router.push("/verify-region");
    }
  }, [MANDATORY_KYC, isVerified, router, toast]);

  if (!isWalletConnected || !chainWallet) {
    return (
      <div className="mx-auto my-6 max-w-4xl px-4 sm:my-10 md:px-0">
        <div className="flex items-center gap-3 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4">
          <AlertCircle className="h-5 w-5 shrink-0 text-yellow-500" />
          <div>
            <Text className="font-medium text-yellow-500">
              Wallet not connected
            </Text>
            <Text className="text-sm text-yellow-500/80">
              Please connect your wallet to deposit Bitcoin.
            </Text>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      {
        registeredBtcResponse.data &&
        <DepositFlow
          registeredAddress={registeredBtcResponse.data.depositAddress}
          depositAmount={registeredBtcResponse.data.depositAmount}
          isConfirmed={registeredBtcResponse.data.isConfirmed}
        />
      }
    </>
  );
};

export default Page;
