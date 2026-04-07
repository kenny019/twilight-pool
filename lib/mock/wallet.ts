import type { QueryClient } from "@tanstack/react-query";
import { MOCK_TWILIGHT_ADDRESS, MOCK_TX_HASH } from "./constants";
import { getMockState, mockRegisterDeposit, mockAddWithdrawRequest } from "./state";

let _queryClient: QueryClient | null = null;

export function setMockQueryClient(client: QueryClient): void {
  _queryClient = client;
}

function invalidate(...keys: string[]) {
  if (!_queryClient) return;
  for (const key of keys) {
    _queryClient.invalidateQueries({ queryKey: [key] });
  }
}

const mockStargateClient = {
  async getBalance(_address: string, denom: string) {
    const s = getMockState();
    if (denom === "sats") return { denom, amount: String(s.satsBalance) };
    if (denom === "nyks") return { denom, amount: String(s.nyksBalance) };
    return { denom, amount: "0" };
  },

  async simulate() {
    return 100_000; // gas estimate
  },

  async signAndBroadcast(
    _address: string,
    msgs: { typeUrl: string; value: any }[],
    _fee: unknown
  ) {
    for (const msg of msgs) {
      if (msg.typeUrl.includes("RegisterBtcDeposit") || msg.typeUrl.includes("registerBtcDeposit")) {
        const { btcDepositAddress, btcSatoshiTestAmount } = msg.value;
        const sats =
          typeof btcSatoshiTestAmount === "number"
            ? btcSatoshiTestAmount
            : Number(btcSatoshiTestAmount?.low ?? btcSatoshiTestAmount);
        mockRegisterDeposit(btcDepositAddress, sats, () => {
          invalidate("btc-registration", "twilightBtcBalance", "indexer-deposits");
        });
        invalidate("btc-registration", "indexer-deposits");
      } else if (msg.typeUrl.includes("WithdrawBtc") || msg.typeUrl.includes("withdrawBtc")) {
        const { withdrawAmount, reserveId } = msg.value;
        const sats =
          typeof withdrawAmount === "number"
            ? withdrawAmount
            : Number(withdrawAmount?.low ?? withdrawAmount);
        const rid =
          typeof reserveId === "number"
            ? reserveId
            : Number(reserveId?.low ?? reserveId);
        mockAddWithdrawRequest(sats, rid);
        invalidate("withdraw-requests", "twilightBtcBalance", "indexer-withdrawals");
      }
    }

    return { code: 0, transactionHash: MOCK_TX_HASH, rawLog: "" };
  },
};

const mockChainWallet = {
  address: MOCK_TWILIGHT_ADDRESS,
  getSigningStargateClient: async () => mockStargateClient,
};

export const mockMainWallet = {
  getChainWallet: (_chainName: string) => mockChainWallet,
};
