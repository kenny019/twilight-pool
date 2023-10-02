import { DialogDescription, DialogTitle } from "@/components/dialog";
import { Text } from "@/components/typography";
import React from "react";
import { WalletViewProps } from "./wallet-view-controller.client";
import WalletProviderButton from "./wallet-provider-button.client";
import cn from "@/lib/cn";

const availableWallets = [
  {
    id: "keplr-extension",
    name: "Keplr",
    src: "/images/keplr-logo.png",
  },
  {
    id: "cosmostation-extension",
    name: "Cosmos Station",
    src: "/images/cosmostation-logo.png",
  },
  {
    id: "leap-extension",
    name: "Leap",
    src: "/images/leap-logo.png",
  },
] as const;

const WalletProvidersView = ({}: WalletViewProps) => {
  return (
    <>
      <DialogTitle>Connect wallet</DialogTitle>
      <DialogDescription
        asChild
        className="grid grid-cols-1 duration-300 animate-in fade-in"
      >
        <div>
          <Text className="col-span-1 mb-4 leading-6 opacity-50">
            Choose your preferred Cosmos wallet to connect to Twilight.
          </Text>
          {availableWallets.map((wallet, index) => (
            <WalletProviderButton
              className={cn(
                index % 2 === 0 && "border-b-0",
                index === availableWallets.length - 1 && "border-b border-t-0"
              )}
              wallet={wallet}
              key={index}
            />
          ))}
        </div>
      </DialogDescription>
    </>
  );
};

export default WalletProvidersView;
