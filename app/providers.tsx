"use client";

import { ThemeProvider } from "next-themes";
import { ChainProvider } from "@cosmos-kit/react-lite";
import { wallets as keplr } from "@cosmos-kit/keplr";
import { wallets as cosmos } from "@cosmos-kit/cosmostation-extension";
import { wallets as leap } from "@cosmos-kit/leap-extension";
import { wallets as leapMetamaskCosmosSnap } from "@cosmos-kit/leap-metamask-cosmos-snap";

import React from "react";
import {
  signerOptions,
  twilightTestnet,
  twilightTestnetAssets,
} from "@/lib/chaindata";
import { MainWalletBase } from "@cosmos-kit/core";
import { TwilightProvider } from "@/lib/providers/twilight";
import { Toaster } from "@/components/toast-provider";
import { PriceFeedProvider } from "@/lib/providers/feed";
import { TwilightStoreProvider } from "@/lib/providers/store";
import { SessionStoreProvider } from "@/lib/providers/session";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider defaultTheme="dark" attribute="class">
      <ChainProvider
        chains={[twilightTestnet]}
        assetLists={[twilightTestnetAssets]}
        wallets={
          [
            ...keplr,
            ...cosmos,
            ...leap,
            ...leapMetamaskCosmosSnap,
          ] as unknown as MainWalletBase[]
        }
        endpointOptions={{
          endpoints: {
            nyks: {
              rpc: [process.env.TWILIGHT_API_RPC as string],
              rest: [process.env.TWILIGHT_API_REST as string],
            },
          },
        }}
        signerOptions={signerOptions}
        // walletConnectOptions={{ // todo: implement for keplr wallet
        //   signClient:
        // }}
      >
        <TwilightProvider>
          <SessionStoreProvider>
            <TwilightStoreProvider>
              <PriceFeedProvider>{children}</PriceFeedProvider>
            </TwilightStoreProvider>
          </SessionStoreProvider>
          <Toaster />
        </TwilightProvider>
      </ChainProvider>
    </ThemeProvider>
  );
}
