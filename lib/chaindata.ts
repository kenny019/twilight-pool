import type { Chain, AssetList } from "@chain-registry/types";
import { getSigningTwilightprojectClientOptions } from "twilightjs";
import { SignerOptions } from "@cosmos-kit/core";
import { GasPrice, SigningStargateClientOptions } from "@cosmjs/stargate";

export const twilightTestnet: Chain = {
  chain_name: "nyks",
  website: "https://twilight.finance",
  status: "testing",
  network_type: "testnet",
  pretty_name: "Twilight Testnet",
  chain_id: "nyks",
  bech32_prefix: "twilight",
  slip44: 118, // testnet slip44 https://github.com/satoshilabs/slips/blob/master/slip-0044.md#registered-coin-types
  apis: {
    rest: [
      {
        address: "https://nyks.twilight-explorer.com/rest/",
        provider: "Twilight",
      },
    ],
    rpc: [
      {
        address: "https://nyks.twilight-explorer.com/tendermint/",
        provider: "Twilight",
      },
    ],
  },
  explorers: [
    {
      kind: "blockExplorer",
      url: "https://nyks.twilight-explorer.com/",
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
        average_gas_price: 0.0025,
        high_gas_price: 0.004,
        low_gas_price: 0.001,
        fixed_min_gas_price: 0.001,
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
      denom_units: [
        {
          denom: "nyks",
          exponent: 0,
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
        svg: "https://twilight-pool.vercel.app/images/twilight.svg",
        png: "https://twilight-pool.vercel.app/images/twilight.png",
      },
    },
  ],
};

export const signerOptions: SignerOptions = {
  signingStargate: () => {
    const { aminoTypes, registry } = getSigningTwilightprojectClientOptions();
    return {
      registry,
      aminoTypes,
      gasPrice: GasPrice.fromString("0.0001nyks"),
    } as unknown as SigningStargateClientOptions; // https://github.com/cosmology-tech/cosmos-kit/issues/234
  },
  signingCosmwasm: () => {
    return {
      gasPrice: GasPrice.fromString("0.0001nyks"),
    };
  },
  preferredSignType: () => {
    return "direct";
  },
};
