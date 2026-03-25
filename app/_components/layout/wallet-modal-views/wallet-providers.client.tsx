import { DialogDescription, DialogTitle } from "@/components/dialog";
import { Text } from "@/components/typography";
import React from "react";
import { WalletViewProps } from "./wallet-view-controller.client";
import WalletProviderButton from "./wallet-provider-button.client";
import Link from "next/link";
import Button from "@/components/button";
import {
  getCurrentWalletClientEnvironment,
  getSupportedWalletDefinitions,
} from "@/lib/wallets/catalog";

const WalletProvidersView = ({}: WalletViewProps) => {
  const clientEnvironment = getCurrentWalletClientEnvironment();
  const isMobile = clientEnvironment === "mobile";
  const availableWallets = getSupportedWalletDefinitions(clientEnvironment);

  return (
    <>
      <DialogTitle>Connect wallet</DialogTitle>
      <DialogDescription asChild>
        <div className="space-y-3 duration-300 animate-in fade-in">
          <Text className="text-sm text-primary-accent">
            Select a wallet to continue
          </Text>

          <div className="space-y-1.5">
            {availableWallets.map((wallet) => (
              <WalletProviderButton wallet={wallet} key={wallet.id} />
            ))}
          </div>

          {!isMobile && (
            <Text className="text-xs leading-relaxed text-primary-accent/50">
              Metamask requires the{" "}
              <Button asChild variant="link" className="inline-flex text-xs">
                <Link
                  href="https://snaps.metamask.io/snap/npm/leapwallet/metamask-cosmos-snap/"
                  target="__blank"
                >
                  Cosmos Snap
                </Link>
              </Button>
              . Snap wallets cannot transfer to other Twilight accounts.
            </Text>
          )}
        </div>
      </DialogDescription>
    </>
  );
};

export default WalletProvidersView;
