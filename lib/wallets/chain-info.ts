import type { Asset, AssetList, Chain } from "@chain-registry/types";
import type { ChainInfo } from "@keplr-wallet/types";

export function getBech32Config(chain: Chain): ChainInfo["bech32Config"] {
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

export function getCoinDecimals(asset: Asset): number {
  return (
    asset.denom_units.find((unit) => unit.denom === asset.display)?.exponent ??
    asset.denom_units[0]?.exponent ??
    0
  );
}

export function getEndpointAddress(
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

/**
 * Build a Keplr-compatible ChainInfo from raw chain-registry types.
 * Does not depend on cosmos-kit's ChainRecord.
 */
export function buildChainInfo(chain: Chain, assets: AssetList): ChainInfo {
  const chainAssets = assets.assets ?? [];
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
      chain.apis?.rpc?.[0]?.address,
      "rpc",
      chain.chain_name
    ),
    rest: getEndpointAddress(
      chain.apis?.rest?.[0]?.address,
      "rest",
      chain.chain_name
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
