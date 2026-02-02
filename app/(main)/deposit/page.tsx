"use client";
import React, { useEffect, useMemo } from "react";
import DepositFlow, { DepositStep } from "@/app/_components/deposit/deposit-flow";
import { Text } from "@/components/typography";
import { useToast } from "@/lib/hooks/useToast";
import useVerifyStatus from "@/lib/hooks/useVerifyStatus";
import useGetRegisteredBTCAddress from "@/lib/hooks/useGetRegisteredBtcAddress";
import { WalletStatus } from "@cosmos-kit/core";
import { useWallet } from "@cosmos-kit/react-lite";
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

  const registeredBtcResponse = useGetRegisteredBTCAddress(
    mainWallet,
    chainWallet
  );

  const btcDepositAddress = useMemo(() => {
    return registeredBtcResponse?.data?.btcDepositAddress || "";
  }, [registeredBtcResponse?.data]);

  const btcSatoshiTestAmount = useMemo(() => {
    return registeredBtcResponse?.data?.btcSatoshiTestAmount || "";
  }, [registeredBtcResponse?.data]);

  const hasRegisteredAddress = btcDepositAddress.length > 0;

  // Determine initial step based on registration status
  const initialStep: DepositStep = hasRegisteredAddress ? "verification" : "registration";

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

  return (
    <>
      {/* Wallet connection warning */}
      {!isWalletConnected && (
        <div className="mx-auto mt-8 max-w-4xl px-4 md:px-0">
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
      )}

      <DepositFlow
        initialStep={initialStep}
        registeredAddress={btcDepositAddress}
        registeredAmount={btcSatoshiTestAmount}
      />
    </>
  );
};

export default Page;
