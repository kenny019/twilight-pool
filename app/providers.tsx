"use client";

import { ThemeProvider } from "next-themes";
import { ChainProvider } from "@cosmos-kit/react-lite";
import { wallets as keplr } from "@cosmos-kit/keplr";
import { wallets as cosmos } from "@cosmos-kit/cosmostation-extension";
import { wallets as leap } from "@cosmos-kit/leap-extension";
import { wallets as leapMetamaskCosmosSnap } from "@cosmos-kit/leap-metamask-cosmos-snap";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

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
import { PnlDisplayModeProvider } from "@/lib/providers/pnl-display-mode";
import { TwilightStoreProvider } from "@/lib/providers/store";
import { SessionStoreProvider } from "@/lib/providers/session";
import { DialogProvider } from "@/lib/providers/limit-dialogs";
import LeaderboardOptInDialog from "@/app/_components/layout/leaderboard-opt-in-dialog.client";

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
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
          sessionOptions={{ duration: 86_400_000 }} // 1 day in ms
          // walletConnectOptions={{ // todo: implement for keplr wallet
          //   signClient:
          // }}
        >
          <TwilightProvider>
            <SessionStoreProvider>
              <TwilightStoreProvider>
                <PriceFeedProvider>
                  <PnlDisplayModeProvider>
                    <DialogProvider>{children}</DialogProvider>
                  </PnlDisplayModeProvider>
                </PriceFeedProvider>
                <LeaderboardOptInDialog />
              </TwilightStoreProvider>
            </SessionStoreProvider>
            <Toaster />
          </TwilightProvider>
        </ChainProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
