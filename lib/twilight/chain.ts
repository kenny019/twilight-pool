import { ChainWalletBase } from "@cosmos-kit/core";

async function generateSignMessage(
  chainWallet: ChainWalletBase,
  twAddress: string,
  message: string
) {
  const client = chainWallet.client;
  if (!client || !client.signArbitrary) return [];

  try {
    const { pub_key, signature } = await client.signArbitrary(
      "nyks",
      twAddress,
      message
    );

    return [pub_key, signature];
  } catch (err) {
    console.error(err);
    return ["", ""];
  }
}

async function getBlockHeight(chainWallet: ChainWalletBase) {
  if (!chainWallet) return 0;

  try {
    const stargateClient = await chainWallet.getStargateClient();
    const height = await stargateClient.getHeight();
    return height;
  } catch (err) {
    console.error(err);
    return 0;
  }
}

export { generateSignMessage, getBlockHeight };
