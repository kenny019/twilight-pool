import { describe, expect, it } from "vitest";
import {
  deriveDepositStatus,
  deriveWithdrawalStatus,
  type PendingDeposit,
  type WithdrawalRestRow,
} from "./derivedStatus";
import type { IndexerDeposit, IndexerWithdrawal } from "./api/indexer";

const makeDeposit = (overrides: Partial<IndexerDeposit> = {}): IndexerDeposit => ({
  id: 1,
  txHash: "0xabc",
  blockHeight: 1000,
  reserveAddress: "bc1qreserve",
  depositAmount: "250000",
  btcHeight: "0",
  btcHash: "0xdeadbeef",
  twilightDepositAddress: "twilight1user",
  oracleAddress: "twilight1oracle",
  votes: 1,
  confirmed: false,
  createdAt: "2026-01-01T00:00:00Z",
  ...overrides,
});

const makeWithdrawal = (
  overrides: Partial<IndexerWithdrawal> = {}
): IndexerWithdrawal => ({
  id: 1,
  withdrawIdentifier: "1",
  twilightAddress: "twilight1user",
  withdrawAddress: "bc1qdest",
  withdrawReserveId: "1",
  blockHeight: 0,
  withdrawAmount: "50000",
  isConfirmed: false,
  createdAt: "2026-01-01T00:00:00Z",
  ...overrides,
});

const ephemeral: PendingDeposit = {
  btcDepositAddress: "bc1quser",
  reserveAddress: "bc1qreserve",
  amountSats: 250_000,
  createdAt: "2026-01-01T00:00:00Z",
};

const restRow: WithdrawalRestRow = {
  withdrawIdentifier: 1,
  withdrawAddress: "bc1qdest",
  withdrawReserveId: "1",
  withdrawAmount: "50000",
};

describe("deriveDepositStatus", () => {
  it("returns null with no data", () => {
    expect(deriveDepositStatus(null, null, 900_000, null)).toBeNull();
  });

  it("awaiting_send: ephemeral + reserve not expired", () => {
    const result = deriveDepositStatus(null, ephemeral, 900_000, {
      unlockHeight: 900_100,
    });
    expect(result).toEqual({ state: "awaiting_send" });
  });

  it("reserve_expired: reserve unlock height reached", () => {
    const result = deriveDepositStatus(null, ephemeral, 900_100, {
      unlockHeight: 900_100,
    });
    expect(result).toEqual({ state: "reserve_expired" });
  });

  it("reserve_expired ignored when no ephemeral", () => {
    expect(
      deriveDepositStatus(null, null, 900_100, { unlockHeight: 900_100 })
    ).toBeNull();
  });

  it("credited: confirmed row trumps ephemeral + expired reserve", () => {
    const row = makeDeposit({ confirmed: true, btcHeight: "899990" });
    const result = deriveDepositStatus(row, ephemeral, 900_100, {
      unlockHeight: 900_100,
    });
    expect(result).toEqual({ state: "credited" });
  });

  it("confirming: unconfirmed row with btcHeight", () => {
    const row = makeDeposit({ btcHeight: "899995" });
    const result = deriveDepositStatus(row, null, 900_000, null);
    expect(result).toMatchObject({
      state: "confirming",
      confirmations: 5,
    });
    expect(result?.etaMinutes).toBe((6 - 5) * 10);
  });

  it("confirming: zero btcHeight yields zero confirmations", () => {
    const row = makeDeposit({ btcHeight: "0" });
    expect(deriveDepositStatus(row, null, 900_000, null)).toEqual({
      state: "confirming",
      confirmations: 0,
      etaMinutes: 60,
    });
  });

  it("confirming: negative confirmations (reorg/clock skew) clamp to 0", () => {
    const row = makeDeposit({ btcHeight: "900010" });
    const result = deriveDepositStatus(row, null, 900_000, null);
    expect(result).toMatchObject({
      state: "confirming",
      confirmations: 0,
    });
  });

  it("confirming: surplus confirmations set etaMinutes to 0", () => {
    const row = makeDeposit({ btcHeight: "899900" });
    const result = deriveDepositStatus(row, null, 900_000, null);
    expect(result).toMatchObject({
      state: "confirming",
      confirmations: 100,
      etaMinutes: 0,
    });
  });

  it("confirming: missing btcHeight falls back to zero confirmations", () => {
    const row = makeDeposit({ btcHeight: "" });
    expect(deriveDepositStatus(row, null, 900_000, null)).toEqual({
      state: "confirming",
      confirmations: 0,
      etaMinutes: 60,
    });
  });

  it("custom required confirmations shrinks etaMinutes", () => {
    const row = makeDeposit({ btcHeight: "899998" });
    const result = deriveDepositStatus(row, null, 900_000, null, {
      requiredConfirmations: 3,
      minutesPerBlock: 10,
    });
    expect(result?.etaMinutes).toBe(10);
  });
});

describe("deriveWithdrawalStatus", () => {
  it("returns null with no data", () => {
    expect(deriveWithdrawalStatus(null, null, null, 900_000)).toBeNull();
  });

  it("failed: tx status failed, no settled indexer row", () => {
    expect(
      deriveWithdrawalStatus(restRow, null, "failed", 900_000)
    ).toEqual({ state: "failed" });
  });

  it("failed trumps indexer broadcast state", () => {
    const row = makeWithdrawal({ blockHeight: 0 });
    expect(
      deriveWithdrawalStatus(restRow, row, "failed", 900_000)
    ).toEqual({ state: "failed" });
  });

  it("settled overrides failed tx status", () => {
    const row = makeWithdrawal({ blockHeight: 899_000, isConfirmed: true });
    expect(
      deriveWithdrawalStatus(restRow, row, "failed", 900_000)
    ).toEqual({ state: "settled" });
  });

  it("requested: REST row present, no indexer row", () => {
    expect(
      deriveWithdrawalStatus(restRow, null, "pending", 900_000)
    ).toEqual({ state: "requested" });
  });

  it("requested: REST row with no tx status", () => {
    expect(
      deriveWithdrawalStatus(restRow, null, null, 900_000)
    ).toEqual({ state: "requested" });
  });

  it("broadcast: indexer row with blockHeight 0", () => {
    const row = makeWithdrawal({ blockHeight: 0 });
    expect(
      deriveWithdrawalStatus(restRow, row, "success", 900_000)
    ).toEqual({ state: "broadcast" });
  });

  it("broadcast: blockHeight missing treated as 0", () => {
    const row = makeWithdrawal({ blockHeight: 0 });
    expect(
      deriveWithdrawalStatus(null, row, null, 900_000)
    ).toEqual({ state: "broadcast" });
  });

  it("confirming: positive blockHeight, unconfirmed", () => {
    const row = makeWithdrawal({ blockHeight: 899_995 });
    const result = deriveWithdrawalStatus(restRow, row, "success", 900_000);
    expect(result).toMatchObject({
      state: "confirming",
      confirmations: 5,
    });
  });

  it("settled: confirmed indexer row", () => {
    const row = makeWithdrawal({ blockHeight: 899_000, isConfirmed: true });
    expect(
      deriveWithdrawalStatus(restRow, row, "success", 900_000)
    ).toEqual({ state: "settled" });
  });

  it("confirming: negative confirmations clamp to 0", () => {
    const row = makeWithdrawal({ blockHeight: 900_010 });
    expect(
      deriveWithdrawalStatus(restRow, row, "success", 900_000)
    ).toMatchObject({ state: "confirming", confirmations: 0 });
  });

  it("indexer ahead of REST still derives from indexer", () => {
    const row = makeWithdrawal({ blockHeight: 899_998, isConfirmed: false });
    const result = deriveWithdrawalStatus(null, row, null, 900_000);
    expect(result?.state).toBe("confirming");
  });
});
