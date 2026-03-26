import type { ChainRecord, MainWalletBase } from "@cosmos-kit/core";
import type { ChainInfo } from "@keplr-wallet/types";
import { buildChainInfo, getEndpointAddress } from "./chain-info";

type MutableWalletWithPatchFlag = MainWalletBase & {
  __twilightKeplrMobilePatched?: boolean;
  client?: {
    addChain?: (chainRecord: ChainRecord) => Promise<void>;
    experimentalSuggestChain?: (chainInfo: ChainInfo) => Promise<void>;
  };
};

const KEPLR_MOBILE_SUGGESTED_CHAINS_KEY =
  "cosmos-kit@2:twilight/keplr-mobile-suggested-chains";

function buildKeplrChainInfo(chainRecord: ChainRecord): ChainInfo {
  const chain = chainRecord.chain;

  if (!chain) {
    throw new Error(`Missing chain metadata for ${chainRecord.name}`);
  }

  const info = buildChainInfo(
    chain,
    chainRecord.assetList ?? { chain_name: chainRecord.name, assets: [] }
  );

  // Override endpoints with cosmos-kit preferred endpoints if available
  return {
    ...info,
    rpc: getEndpointAddress(
      chainRecord.preferredEndpoints?.rpc?.[0] ?? chain.apis?.rpc?.[0]?.address,
      "rpc",
      chainRecord.name
    ),
    rest: getEndpointAddress(
      chainRecord.preferredEndpoints?.rest?.[0] ??
        chain.apis?.rest?.[0]?.address,
      "rest",
      chainRecord.name
    ),
  } as ChainInfo;
}

function readSuggestedChains(): string[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const value = window.localStorage.getItem(
      KEPLR_MOBILE_SUGGESTED_CHAINS_KEY
    );

    return value ? JSON.parse(value) : [];
  } catch {
    return [];
  }
}

function writeSuggestedChains(chains: string[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    KEPLR_MOBILE_SUGGESTED_CHAINS_KEY,
    JSON.stringify(chains)
  );
}

function patchKeplrMobileWallet(wallet: MutableWalletWithPatchFlag) {
  if (
    wallet.walletName !== "keplr-mobile" ||
    wallet.__twilightKeplrMobilePatched
  ) {
    return wallet;
  }

  const originalInitClient = wallet.initClient.bind(wallet);

  wallet.initClient = async function patchedInitClient(options) {
    await originalInitClient(options);

    const client = wallet.client;

    if (!client || client.addChain || !client.experimentalSuggestChain) {
      return;
    }

    client.addChain = async (chainRecord) => {
      if (!chainRecord.chain) {
        return;
      }

      const suggestedChains = readSuggestedChains();

      if (suggestedChains.includes(chainRecord.name)) {
        return;
      }

      await client.experimentalSuggestChain?.(buildKeplrChainInfo(chainRecord));
      writeSuggestedChains([...suggestedChains, chainRecord.name]);
    };
  };

  wallet.__twilightKeplrMobilePatched = true;

  return wallet;
}

export function patchKeplrWallets(wallets: MainWalletBase[]): MainWalletBase[] {
  return wallets.map((wallet) =>
    patchKeplrMobileWallet(wallet as MutableWalletWithPatchFlag)
  );
}
