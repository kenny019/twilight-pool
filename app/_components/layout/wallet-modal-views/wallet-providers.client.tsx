import { DialogDescription, DialogTitle } from "@/components/dialog";
import { Text } from "@/components/typography";
import React from "react";
import { WalletViewProps } from "./wallet-view-controller.client";
import WalletProviderButton from "./wallet-provider-button.client";
import cn from "@/lib/cn";
import Link from 'next/link';
import Button from '@/components/button';
import { isMobileBrowser } from "@/lib/utils/is-mobile";

const allWallets = [
  {
    id: "keplr-extension",
    name: "Keplr",
    src: "/images/keplr-logo.png",
    desktopOnly: true,
  },
  {
    id: "keplr-mobile",
    name: "Keplr Mobile",
    src: "/images/keplr-logo.png",
    mobileOnly: true,
  },
  {
    id: "leap-metamask-cosmos-snap",
    name: "Metamask",
    src: "/images/metamask-logo.png",
    desktopOnly: true,
  },
] as const;

const WalletProvidersView = ({ }: WalletViewProps) => {
  const isMobile = isMobileBrowser();
  const availableWallets = allWallets.filter((w) =>
    isMobile ? !w.desktopOnly : !w.mobileOnly
  );

  return (
    <>
      <DialogTitle>Connect wallet</DialogTitle>
      <DialogDescription
        asChild
        className="grid grid-cols-1 duration-300 animate-in fade-in"
      >
        <div>
          <Text className="col-span-1 mb-4 leading-6 text-base text-primary/80">
            Choose your preferred Cosmos wallet to connect to Twilight.
            <br />
          </Text>

          {availableWallets.map((wallet, index) => (
            <WalletProviderButton
              className={cn(
                index === 0 && "rounded-t-md",
                index % 2 === 0 && "border-b-0",
                index === availableWallets.length - 1 && "rounded-b-md border-t"
              )}
              wallet={wallet}
              key={wallet.id}
            />
          ))}
          {!isMobile && (
            <Text className="col-span-1 leading-6 mt-2 opacity-50 text-sm">
              Note: For Metamask, only the Cosmos Snap is supported. Transfers to other Twilight accounts are not supported by the Cosmos Snap. Install it <Button asChild variant="link" className="inline-flex"><Link href="https://snaps.metamask.io/snap/npm/leapwallet/metamask-cosmos-snap/" target="__blank">here</Link></Button>.
            </Text>
          )}
        </div>
      </DialogDescription>
    </>
  );
};

export default WalletProvidersView;
