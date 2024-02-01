import { ChainWalletBase } from "@cosmos-kit/core";
import { generatePublicKey, generateTradingAccountAddress } from "./zkos";
import wfetch from "../http";
import { TradingAccountStruct } from "../types";

async function generateSignMessage(
  chainWallet: ChainWalletBase,
  twAddress: string,
  message: string
) {
  const client = chainWallet.client;
  if (!client || !client.signArbitrary) return [];

  const { pub_key, signature } = await client.signArbitrary(
    "nyks",
    twAddress,
    message
  );

  return [pub_key, signature];
}

function getLocalTradingAccount(
  twilightAddress: string
): Partial<TradingAccountStruct> {
  try {
    const data = window.localStorage.getItem(
      `twilight-trading-${twilightAddress}`
    );

    if (!data) return {};

    const tradingAccount = JSON.parse(data);

    console.log("getting local trading account data", tradingAccount);

    return tradingAccount;
  } catch (err) {
    console.error(
      `Error reading localStorage, key twilight-${twilightAddress}-trading-address`,
      err
    );
    return {};
  }
}

function setLocalTradingAccount(
  twilightAddress: string,
  data: TradingAccountStruct
) {
  try {
    window.localStorage.setItem(
      `twilight-trading-${twilightAddress}`,
      JSON.stringify(data)
    );

    console.log("updated trading account");
  } catch (err) {
    console.error(err);
  }
}

async function createSubaccount(signature: string) {
  const publicKeyHex = await generatePublicKey({
    signature: signature,
  });

  const newSubAccountAddress = generateTradingAccountAddress({
    publicKeyHex,
  });

  return newSubAccountAddress;
}

type UtxoFromDBResponse = {
  result: {
    result: string;
  };
};

async function getUtxosFromDB() {
  const body = {
    jsonrpc: "2.0",
    method: "getUtxosFromDB",
    params: {
      start_block: 0,
      end_block: -1,
      limit: 1000,
      pagination: 0,
      io_type: "Coin",
    },
    id: 1,
  };

  const apiURL = process.env.NEXT_PUBLIC_ZKOS_API_ENDPOINT as string;
  const { data, error, success } = await wfetch(apiURL)
    .post({
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    })
    .json<UtxoFromDBResponse>();

  if (!success) {
    console.error(error);
    return "";
  }

  return data;
}

export {
  generateSignMessage,
  getLocalTradingAccount,
  setLocalTradingAccount,
  createSubaccount,
  getUtxosFromDB,
};
