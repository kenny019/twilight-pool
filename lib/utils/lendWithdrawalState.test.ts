import { describe, expect, it } from "vitest";
import type { LendOrder, ZkAccount } from "@/lib/types";
import {
  buildBurnReadyFundingAccount,
  buildRecoverableLendAccount,
  buildStagedFundingAccount,
  completeLendWithdrawal,
  createFundingBurnHistoryEntry,
  createRelayerSettleHistoryEntry,
  createStagedTransferHistoryEntry,
  markLendWithdrawalPending,
} from "./lendWithdrawalState";

const baseOrder: LendOrder = {
  uuid: "lend-1",
  accountAddress: "account-1",
  orderStatus: "LENDED",
  value: 1,
  payment: 0,
  timestamp: new Date("2026-03-01T00:00:00Z"),
  tx_hash: "old-hash",
};

const baseAccount: ZkAccount = {
  tag: "BTC lend 1",
  address: "zk-1",
  scalar: "scalar-1",
  type: "Coin",
  isOnChain: true,
  value: 10,
  createdAt: 123,
};

describe("lendWithdrawalState", () => {
  it("marks a lend as pending while relayer settlement is being finalized locally", () => {
    expect(markLendWithdrawalPending(baseOrder)).toEqual({
      ...baseOrder,
      withdrawPending: true,
    });
  });

  it("builds the settled lend-history entry after relayer settlement", () => {
    const timestamp = new Date("2026-03-24T00:00:00Z");

    expect(
      completeLendWithdrawal({
        order: {
          ...baseOrder,
          withdrawPending: true,
        },
        value: 25,
        payment: 3,
        txHash: "new-hash",
        timestamp,
      })
    ).toEqual({
      ...baseOrder,
      orderStatus: "SETTLED",
      withdrawPending: false,
      value: 25,
      payment: 3,
      tx_hash: "new-hash",
      timestamp,
    });
  });

  it("builds the relayer settlement wallet history entry", () => {
    const date = new Date("2026-03-24T00:00:00Z");

    expect(
      createRelayerSettleHistoryEntry({
        accountAddress: "account-1",
        accountTag: "Primary Trading Account",
        txHash: "relayer-tx",
        value: 42,
        date,
      })
    ).toEqual({
      date,
      from: "account-1",
      fromTag: "Primary Trading Account",
      to: "account-1",
      toTag: "Primary Trading Account",
      tx_hash: "relayer-tx",
      value: 42,
      type: "Withdraw Lend",
    });
  });

  it("builds the staged transfer and funding burn wallet history entries", () => {
    const date = new Date("2026-03-24T00:00:00Z");

    expect(
      createStagedTransferHistoryEntry({
        fromAddress: "zk-1",
        fromTag: "BTC lend 1",
        toAddress: "zk-2",
        toTag: "BTC lend 1",
        txId: "transfer-tx",
        value: 100,
        date,
      })
    ).toEqual({
      date,
      from: "zk-1",
      fromTag: "BTC lend 1",
      to: "zk-2",
      toTag: "BTC lend 1",
      tx_hash: "transfer-tx",
      value: 100,
      type: "Transfer",
    });

    expect(
      createFundingBurnHistoryEntry({
        fromAddress: "zk-2",
        fromTag: "BTC lend 1",
        twilightAddress: "twilight-1",
        txHash: "burn-tx",
        value: 100,
        date,
      })
    ).toEqual({
      date,
      from: "zk-2",
      fromTag: "BTC lend 1",
      to: "twilight-1",
      toTag: "Funding",
      tx_hash: "burn-tx",
      value: 100,
      type: "Burn",
    });
  });

  it("builds recoverable and staged funding account payloads without losing value ownership", () => {
    const recoverable = buildRecoverableLendAccount({
      account: baseAccount,
      value: 99,
    });

    expect(recoverable).toEqual({
      ...baseAccount,
      type: "CoinSettled",
      value: 99,
    });

    const staged = buildStagedFundingAccount({
      account: recoverable,
      updatedAddress: "zk-2",
      updatedScalar: "scalar-2",
      value: 99,
    });

    expect(staged).toEqual({
      type: "Coin",
      address: "zk-2",
      scalar: "scalar-2",
      isOnChain: true,
      value: 99,
      tag: "BTC lend 1",
    });

    expect(
      buildBurnReadyFundingAccount({
        account: staged,
        zkAccountHex: "0xabc",
      })
    ).toEqual({
      ...staged,
      isOnChain: false,
      zkAccountHex: "0xabc",
    });
  });
});
