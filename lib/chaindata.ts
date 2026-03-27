import type { Chain, AssetList } from "@chain-registry/types";
import { getSigningTwilightprojectClientOptions } from "twilightjs";
import { SignerOptions } from "@cosmos-kit/core";
import { GasPrice, SigningStargateClientOptions } from "@cosmjs/stargate";
import { TWILIGHT_NETWORK_TYPE } from "./constants";

const DEFAULT_APP_URL = "https://twilight-pool.vercel.app";
const DEFAULT_EXPLORER_URL = "https://explorer.twilight.rest";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || DEFAULT_APP_URL;
const EXPLORER_URL =
  process.env.NEXT_PUBLIC_CHAIN_EXPLORER_URL ||
  process.env.NEXT_PUBLIC_EXPLORER_URL ||
  DEFAULT_EXPLORER_URL;

export const twilightTestnet: Chain = {
  chain_name: "nyks",
  chain_type: "cosmos",
  website: "https://twilight.finance",
  status: "upcoming",
  network_type: TWILIGHT_NETWORK_TYPE,
  pretty_name: `Twilight ${TWILIGHT_NETWORK_TYPE.charAt(0).toUpperCase() + TWILIGHT_NETWORK_TYPE.slice(1)}`,
  chain_id: "nyks",
  bech32_prefix: "twilight",
  slip44: 118,
  apis: {
    // note: helpful information, /rest and /api are the same endpoint for twilight-explorer
    rest: [
      {
        address: process.env.NEXT_PUBLIC_TWILIGHT_API_REST as string,
        provider: "Twilight",
      },
    ],
    rpc: [
      {
        address: process.env.NEXT_PUBLIC_TWILIGHT_API_RPC as string,
        provider: "Twilight",
      },
    ],
  },
  explorers: [
    {
      kind: "blockExplorer",
      url: EXPLORER_URL,
      tx_page: `${EXPLORER_URL}/txs/%7BtxHash%7D`,
      account_page: `${EXPLORER_URL}/account/%7BaccountAddress%7D`,
    },
  ],
  bech32_config: {
    bech32PrefixAccAddr: "twilight",
    bech32PrefixAccPub: "twilight" + "pub",
    bech32PrefixValAddr: "twilight" + "valoper",
    bech32PrefixValPub: "twilight" + "valoperpub",
    bech32PrefixConsAddr: "twilight" + "valcons",
    bech32PrefixConsPub: "twilight" + "valconspub",
  },
  fees: {
    fee_tokens: [
      {
        denom: "nyks",
        average_gas_price: 0.0001,
        high_gas_price: 0.0001,
        low_gas_price: 0.0001,
        fixed_min_gas_price: 0.0001,
      },
    ],
  },
  staking: {
    staking_tokens: [
      {
        denom: "nyks",
      },
    ],
  },
};

export const twilightTestnetAssets: AssetList = {
  chain_name: "nyks",
  assets: [
    {
      description: "The native staking token of Twilight.",
      type_asset: "sdk.coin",
      denom_units: [
        {
          denom: "nyks",
          exponent: 0,
          aliases: ["NYKS"],
        },
        {
          denom: "sats",
          exponent: 0,
        },
      ],
      base: "nyks",
      name: "nyks",
      display: "nyks",
      symbol: "NYKS",
      logo_URIs: {
        svg: `${APP_URL}/images/twilight.svg`,
        png: `${APP_URL}/images/twilight.png`,
      },
    },
    {
      description:
        "The native BTC-backed token on Twilight, representing 1 satoshi per SATS.",
      type_asset: "sdk.coin",
      denom_units: [
        {
          denom: "sats",
          exponent: 0,
          aliases: ["SATS"],
        },
      ],
      base: "sats",
      name: "sats",
      display: "sats",
      symbol: "SATS",
      logo_URIs: {
        svg: `${APP_URL}/images/twilight.svg`,
        png: `${APP_URL}/images/twilight.png`,
      },
    },
  ],
};

export const signerOptions: SignerOptions = {
  signingStargate: ((chain: string | Chain) => {
    const { aminoTypes, registry } = getSigningTwilightprojectClientOptions();
    return {
      registry,
      aminoTypes,
      gasPrice: GasPrice.fromString("0.0001nyks"),
    } as unknown as SigningStargateClientOptions;
  }) as SignerOptions["signingStargate"],
  // signingCosmwasm: (chain) => {
  //   return {
  //     gasPrice: GasPrice.fromString("0.0001nyks") as GasPrice,
  //   }
  // },
  preferredSignType: () => {
    return "direct";
  },
};
