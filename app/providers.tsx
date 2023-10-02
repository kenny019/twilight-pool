// app/providers.jsx

"use client";

import { ThemeProvider } from "next-themes";
import { ChainProvider } from "@cosmos-kit/react-lite";
import { wallets as keplr } from "@cosmos-kit/keplr-extension";
import { wallets as cosmos } from "@cosmos-kit/cosmostation-extension";
import { wallets as leap } from "@cosmos-kit/leap-extension";

import React from "react";
import {
  signerOptions,
  twilightTestnet,
  twilightTestnetAssets,
} from "@/lib/chaindata";
import { MainWalletBase } from "@cosmos-kit/core";
import { TwilightProvider } from "@/lib/singleton";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider defaultTheme="dark" attribute="class">
      <ChainProvider
        chains={[twilightTestnet]}
        assetLists={[twilightTestnetAssets]}
        wallets={[...keplr, ...cosmos, ...leap] as unknown as MainWalletBase[]}
        endpointOptions={{
          endpoints: {
            nyks: {
              rpc: [process.env.TWILIGHT_API_RPC as string],
              rest: [process.env.TWILIGHT_API_REST as string],
            },
          },
        }}
        signerOptions={signerOptions}
      >
        <TwilightProvider>{children}</TwilightProvider>
      </ChainProvider>
    </ThemeProvider>
  );
}
