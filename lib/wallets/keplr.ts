import type { Asset, AssetList, Chain } from "@chain-registry/types";
import type { ChainRecord, MainWalletBase } from "@cosmos-kit/core";
import type { ChainInfo } from "@keplr-wallet/types";

type MutableWalletWithPatchFlag = MainWalletBase & {
  __twilightKeplrMobilePatched?: boolean;
  client?: {
    addChain?: (chainRecord: ChainRecord) => Promise<void>;
    experimentalSuggestChain?: (chainInfo: ChainInfo) => Promise<void>;
  };
};

const KEPLR_MOBILE_SUGGESTED_CHAINS_KEY =
  "cosmos-kit@2:twilight/keplr-mobile-suggested-chains";

function getBech32Config(chain: Chain): ChainInfo["bech32Config"] {
  if (chain.bech32_config) {
    return chain.bech32_config as ChainInfo["bech32Config"];
  }

  const prefix = chain.bech32_prefix;

  if (!prefix) {
    throw new Error(`Missing bech32 prefix for chain ${chain.chain_name}`);
  }

  return {
    bech32PrefixAccAddr: prefix,
    bech32PrefixAccPub: `${prefix}pub`,
    bech32PrefixValAddr: `${prefix}valoper`,
    bech32PrefixValPub: `${prefix}valoperpub`,
    bech32PrefixConsAddr: `${prefix}valcons`,
    bech32PrefixConsPub: `${prefix}valconspub`,
  };
}

function getCoinDecimals(asset: Asset): number {
  return (
    asset.denom_units.find((unit) => unit.denom === asset.display)?.exponent ??
    asset.denom_units[0]?.exponent ??
    0
  );
}

function buildKeplrChainInfo(chainRecord: ChainRecord): ChainInfo {
  const chain = chainRecord.chain;

  if (!chain) {
    throw new Error(`Missing chain metadata for ${chainRecord.name}`);
  }

  const chainAssets = chainRecord.assetList?.assets ?? [];
  const feeDenoms = new Set(
    chain.fees?.fee_tokens.map((token) => token.denom) ?? []
  );
  const stakingDenoms = new Set(
    chain.staking?.staking_tokens.map((token) => token.denom) ?? []
  );
  const gasPriceSteps = Object.fromEntries(
    (chain.fees?.fee_tokens ?? []).map((token) => [
      token.denom,
      {
        low: token.low_gas_price ?? 0.01,
        average: token.average_gas_price ?? 0.025,
        high: token.high_gas_price ?? 0.04,
      },
    ])
  );

  const currencies = chainAssets.map((asset) => ({
    coinDenom: asset.symbol,
    coinMinimalDenom: asset.base,
    coinDecimals: getCoinDecimals(asset),
    coinGeckoId: asset.coingecko_id || undefined,
    coinImageUrl: asset.logo_URIs?.svg ?? asset.logo_URIs?.png,
  }));

  const stakeCurrency =
    currencies.find(
      (currency) =>
        stakingDenoms.has(currency.coinMinimalDenom) ||
        stakingDenoms.has(currency.coinDenom)
    ) ?? currencies[0];

  const feeCurrencies = currencies
    .filter((currency) => feeDenoms.has(currency.coinMinimalDenom))
    .map((currency) => {
      const gasPriceStep = gasPriceSteps[currency.coinMinimalDenom];

      return gasPriceStep ? { ...currency, gasPriceStep } : currency;
    });

  return {
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
    chainId: chain.chain_id,
    chainName: chain.pretty_name ?? chain.chain_name,
    bip44: { coinType: chain.slip44 ?? 118 },
    bech32Config: getBech32Config(chain),
    currencies,
    stakeCurrency,
    feeCurrencies: feeCurrencies.length > 0 ? feeCurrencies : [stakeCurrency],
    features: [],
  };
}

function getEndpointAddress(
  endpoint: string | { address?: string; url?: string } | undefined,
  type: "rpc" | "rest",
  chainName: string
): string {
  if (typeof endpoint === "string" && endpoint) {
    return endpoint;
  }

  if (endpoint && typeof endpoint === "object") {
    if (endpoint.address) {
      return endpoint.address;
    }

    if (endpoint.url) {
      return endpoint.url;
    }
  }

  throw new Error(`Missing ${type} endpoint for chain ${chainName}`);
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
