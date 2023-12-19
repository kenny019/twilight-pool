"use client";
import TransferDialog from "@/app/_components/wallet/transfer-dialog.client";
import Button from "@/components/button";
import { Separator } from "@/components/seperator";
import { Text } from "@/components/typography";
import { useWallet } from "@cosmos-kit/react-lite";
import { ArrowDownToLine, ArrowLeftRight, Wallet } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useEffect } from "react";

const tradingAccountAddress =
  "0c2611d9cc63de94577c009e04a4f8b4116ff7f663b04ce9e31a52f0f933eeb34254a097e4df1f4513e81a1bf4610cc5e87f2b57059988785da805deed45e8df4d01e938e0";

const Page = () => {
  const { status } = useWallet();
  const router = useRouter();

  function useRedirectUnconnected() {
    useEffect(() => {
      if (status !== "Disconnected") {
        return;
      }

      const redirectTimeout = setTimeout(() => {
        console.log(status);

        router.replace("/");
      }, 500);
      return () => clearTimeout(redirectTimeout);
    }, [status]);
  }

  useRedirectUnconnected();

  return (
    <div className="mx-8 mt-4 space-y-8">
      <div className="flex w-full max-w-4xl flex-row items-baseline justify-between">
        <div className="fspace-y-4">
          <Text heading="h1" className="font-normal">
            Assets Overview
          </Text>
          <div className="space-y-1">
            <Text className="text-6xl">
              1.38
              <span className="ml-1 inline-flex text-sm">BTC</span>
            </Text>
            <Text className="text-xs text-primary-accent">= 56632.11 USD</Text>
          </div>
        </div>
        <div className="flex w-full max-w-sm flex-col">
          <Text heading="h2" className="text-2xl font-normal">
            My Assets
          </Text>
          <div className="space-y-4">
            <div className="flex w-full justify-between">
              <Text>Funding</Text>
              <div>
                <Text className="text-primary/80">0.000000000 BTC</Text>
                <Text className="text-xs text-primary-accent">= 0.00 USD</Text>
              </div>
              <div className="flex flex-row space-x-2">
                <Button variant="ui" size="icon">
                  <ArrowDownToLine className="h-4 w-4" />
                </Button>
                <TransferDialog
                  tradingAccountAddress={tradingAccountAddress}
                  defaultAccount="funding"
                >
                  <Button variant="ui" size="icon">
                    <ArrowLeftRight className="h-4 w-4" />
                  </Button>
                </TransferDialog>
              </div>
            </div>

            <Separator />

            <div className="flex w-full justify-between">
              <Text>Trading</Text>
              <div>
                <Text className="text-primary/80">1.380000000 BTC</Text>
                <Text className="text-xs text-primary-accent">
                  = 56632.11 USD
                </Text>
              </div>
              <div className="flex flex-row space-x-2">
                <Button variant="ui" size="icon">
                  <ArrowDownToLine className="h-4 w-4" />
                </Button>

                <TransferDialog
                  tradingAccountAddress="
                  "
                  defaultAccount="trading"
                >
                  <Button variant="ui" size="icon">
                    <ArrowLeftRight className="h-4 w-4" />
                  </Button>
                </TransferDialog>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="h-full min-h-[500px] w-full rounded-md border"></div>
    </div>
  );
};

export default Page;
