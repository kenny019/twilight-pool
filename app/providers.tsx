"use client";

import { ThemeProvider } from "next-themes";
import { ChainProvider } from "@cosmos-kit/react-lite";
import { wallets as keplr } from "@cosmos-kit/keplr";
import { wallets as cosmos } from "@cosmos-kit/cosmostation-extension";
import { wallets as leap } from "@cosmos-kit/leap-extension";
import { wallets as leapMetamaskCosmosSnap } from "@cosmos-kit/leap-metamask-cosmos-snap";
import { wallets as cosmostationMobile } from "@cosmos-kit/cosmostation-mobile";
import { wallets as leapMobile } from "@cosmos-kit/leap-mobile";
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
import { patchKeplrWallets } from "@/lib/wallets/keplr";
import {
  filterWalletsByClientEnvironment,
  getCurrentWalletClientEnvironment,
} from "@/lib/wallets/catalog";

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

const _clientEnv = getCurrentWalletClientEnvironment();
const _wallets = filterWalletsByClientEnvironment(
  [
    ...patchKeplrWallets(keplr as unknown as MainWalletBase[]),
    ...cosmos,
    ...leap,
    ...leapMetamaskCosmosSnap,
    ...cosmostationMobile,
    ...leapMobile,
  ] as unknown as MainWalletBase[],
  _clientEnv
);

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark" attribute="class">
        <ChainProvider
          chains={[twilightTestnet]}
          assetLists={[twilightTestnetAssets]}
          wallets={_wallets}
          endpointOptions={{
            endpoints: {
              nyks: {
                rpc: [process.env.NEXT_PUBLIC_TWILIGHT_API_RPC as string],
                rest: [process.env.NEXT_PUBLIC_TWILIGHT_API_REST as string],
              },
            },
          }}
          signerOptions={signerOptions}
          sessionOptions={{ duration: 86_400_000 }} // 1 day in ms
          walletConnectOptions={{
            signClient: {
              projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID!,
            },
          }}
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
