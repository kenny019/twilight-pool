import { ChainWalletBase } from "@cosmos-kit/core";
import { twilightproject } from "twilightjs";
import Long from "long";

export interface BTCRegistrationOptions {
  btcSatoshiTestAmount?: number;
  twilightStakingAmount?: number;
}

export interface BTCRegistrationResult {
  success: boolean;
  txHash?: string;
  error?: string;
}

/**
 * Generates a random Bitcoin testnet address
 */
export const generateRandomBtcTestnetAddress = (): string => {
  const randomHex = Array.from({ length: 32 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join("");

  return `tb1q${randomHex}`;
};

/**
 * Registers a BTC deposit address for the given chain wallet
 */
export const registerBTCAddress = async (
  chainWallet: ChainWalletBase,
  options: BTCRegistrationOptions = {}
): Promise<BTCRegistrationResult> => {
  try {
    const twilightAddress = chainWallet.address;

    if (!twilightAddress) {
      return {
        success: false,
        error: "No Twilight address found",
      };
    }

    const stargateClient = await chainWallet.getSigningStargateClient();

    const { registerBtcDepositAddress } =
      twilightproject.nyks.bridge.MessageComposer.withTypeUrl;

    const msg = registerBtcDepositAddress({
      btcDepositAddress: generateRandomBtcTestnetAddress(),
      twilightAddress: twilightAddress,
      btcSatoshiTestAmount: Long.fromNumber(
        options.btcSatoshiTestAmount || 50_000
      ),
      twilightStakingAmount: Long.fromNumber(
        options.twilightStakingAmount || 50_000
      ),
    });

    const result = await stargateClient.signAndBroadcast(
      twilightAddress,
      [msg],
      "auto"
    );

    return {
      success: true,
      txHash: result.transactionHash,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : typeof error === "string" ? error : "";
    if (/request rejected|user denied|rejected|declined/i.test(message)) {
      return {
        success: false,
        error: "You declined the transaction in your wallet.",
      };
    }
    console.error("BTC registration error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
};
