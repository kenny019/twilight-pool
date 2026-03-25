import type { ChainRecord, MainWalletBase } from "@cosmos-kit/core";
import type { ChainInfo } from "@keplr-wallet/types";
import {
  getBech32Config,
  getCoinDecimals,
  getEndpointAddress,
} from "./chain-info";

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
        low: token.low_gas_price ?? 1,
        average: token.average_gas_price ?? 1,
        high: token.high_gas_price ?? 1,
      },
    ])
  );

  const currencies = chainAssets.map((asset) => {
    const currency: {
      coinDenom: string;
      coinMinimalDenom: string;
      coinDecimals: number;
      coinGeckoId?: string;
    } = {
      coinDenom: asset.symbol,
      coinMinimalDenom: asset.base,
      coinDecimals: getCoinDecimals(asset),
    };
    if (asset.coingecko_id) {
      currency.coinGeckoId = asset.coingecko_id;
    }
    return currency;
  });

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

  const logoUrl =
    chainAssets[0]?.logo_URIs?.svg ?? chainAssets[0]?.logo_URIs?.png;

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
    ...(logoUrl && { image: logoUrl }),
    theme: {
      primaryColor: "#6C5CE7",
      gradient:
        "linear-gradient(180deg, rgba(108,92,231,0.32) 0%, rgba(108,92,231,0) 100%)",
    },
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
