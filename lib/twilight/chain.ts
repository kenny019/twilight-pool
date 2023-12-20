import { ChainWalletBase } from "@cosmos-kit/core";

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

function getQuisTradingAddress(twilightAddress: string) {
  try {
    const data = window.localStorage.getItem(
      `twilight-${twilightAddress}-trading-address`
    );

    if (!data) return "";

    console.log("grabbing quis trading address", data);

    return data;
  } catch (err) {
    console.error(
      `Error reading localStorage, key twilight-${twilightAddress}-trading-address`,
      err
    );
    return "";
  }
}

export { generateSignMessage, getQuisTradingAddress };
