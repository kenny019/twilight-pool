import { describe, expect, it } from "vitest";
import { ephemeralMatchesIndexerRow } from "./useDepositFeed";
import type { IndexerDeposit } from "../api/indexer";
import type { PendingDeposit } from "../derivedStatus";

const baseRow: IndexerDeposit = {
  id: 1,
  txHash: "aa".repeat(32),
  blockHeight: 100,
  reserveAddress: "bc1qreserve",
  depositAmount: "250000",
  btcHeight: "840000",
  btcHash: "00".repeat(32),
  twilightDepositAddress: "bc1qsender",
  oracleAddress: "twilight1oracle",
  votes: 3,
  confirmed: true,
  createdAt: "2026-01-01T00:00:00Z",
};

const ephemeral: PendingDeposit = {
  btcDepositAddress: "bc1qsender",
  reserveAddress: "bc1qreserve",
  amountSats: 250000,
  createdAt: "2026-06-01T00:00:00Z",
};

describe("ephemeralMatchesIndexerRow", () => {
  it("does not match on different address or amount", () => {
    expect(
      ephemeralMatchesIndexerRow(
        { ...baseRow, twilightDepositAddress: "bc1qother" },
        ephemeral
      )
    ).toBe(false);
    expect(
      ephemeralMatchesIndexerRow({ ...baseRow, depositAmount: "1" }, ephemeral)
    ).toBe(false);
  });

  it("matches any row when no recency cutoff is given (chain-pending path)", () => {
    expect(ephemeralMatchesIndexerRow(baseRow, ephemeral)).toBe(true);
    expect(ephemeralMatchesIndexerRow(baseRow, ephemeral, null)).toBe(true);
  });

  it("ignores credited rows older than the cutoff (repeat same-amount deposit)", () => {
    expect(
      ephemeralMatchesIndexerRow(baseRow, ephemeral, ephemeral.createdAt)
    ).toBe(false);
  });

  it("matches credited rows at/after the cutoff", () => {
    const fresh = { ...baseRow, createdAt: "2026-06-01T01:00:00Z" };
    expect(
      ephemeralMatchesIndexerRow(fresh, ephemeral, ephemeral.createdAt)
    ).toBe(true);
  });

  it("always matches unconfirmed rows regardless of cutoff", () => {
    const inFlight = { ...baseRow, confirmed: false };
    expect(
      ephemeralMatchesIndexerRow(inFlight, ephemeral, ephemeral.createdAt)
    ).toBe(true);
  });
});
