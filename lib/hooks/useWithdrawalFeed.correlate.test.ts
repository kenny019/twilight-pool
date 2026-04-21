import { describe, expect, it } from "vitest";
import { correlate } from "./useWithdrawalFeed";
import type { IndexerWithdrawal } from "../api/indexer";
import type { WithdrawalRestRow } from "../derivedStatus";

const makeRest = (id: number, overrides: Partial<WithdrawalRestRow> = {}): WithdrawalRestRow => ({
  withdrawIdentifier: id,
  withdrawAddress: "bc1qdest",
  withdrawReserveId: "1",
  withdrawAmount: "50000",
  ...overrides,
});

const makeIndexer = (
  id: number,
  overrides: Partial<IndexerWithdrawal> = {}
): IndexerWithdrawal => ({
  id,
  withdrawIdentifier: String(id),
  twilightAddress: "twilight1user",
  withdrawAddress: "bc1qdest",
  withdrawReserveId: "1",
  blockHeight: 0,
  withdrawAmount: "50000",
  isConfirmed: false,
  createdAt: "2026-01-01T00:00:00Z",
  ...overrides,
});

describe("correlate", () => {
  it("matches by withdrawIdentifier", () => {
    const pairs = correlate([makeRest(1), makeRest(2)], [makeIndexer(2), makeIndexer(1)]);
    expect(pairs).toHaveLength(2);
    expect(pairs[0].restRow?.withdrawIdentifier).toBe(1);
    expect(pairs[0].indexerRow?.id).toBe(1);
    expect(pairs[1].restRow?.withdrawIdentifier).toBe(2);
    expect(pairs[1].indexerRow?.id).toBe(2);
  });

  it("keeps rest row unmatched when no indexer row exists", () => {
    const pairs = correlate([makeRest(1)], []);
    expect(pairs).toEqual([{ restRow: expect.anything(), indexerRow: null }]);
  });

  it("keeps indexer row unmatched when no rest row exists", () => {
    const pairs = correlate([], [makeIndexer(5)]);
    expect(pairs).toHaveLength(1);
    expect(pairs[0].restRow).toBeNull();
    expect(pairs[0].indexerRow?.id).toBe(5);
  });

  it("falls back to composite match when identifier diverges", () => {
    const rest = makeRest(1);
    const indexer = makeIndexer(1, { withdrawIdentifier: "999" });
    const pairs = correlate([rest], [indexer]);
    expect(pairs).toHaveLength(1);
    expect(pairs[0].indexerRow).toBe(indexer);
  });

  it("ambiguous duplicates: FIFO — first rest matches first indexer", () => {
    const rest1 = makeRest(1);
    const rest2 = makeRest(2);
    const indexer1 = makeIndexer(10, { withdrawIdentifier: "x1" });
    const indexer2 = makeIndexer(11, { withdrawIdentifier: "x2" });
    const pairs = correlate([rest1, rest2], [indexer1, indexer2]);
    expect(pairs[0].indexerRow?.id).toBe(10);
    expect(pairs[1].indexerRow?.id).toBe(11);
  });

  it("does not reuse an indexer row for two rest rows", () => {
    const rest1 = makeRest(1);
    const rest2 = makeRest(2);
    const indexer = makeIndexer(99, { withdrawIdentifier: "zz" });
    const pairs = correlate([rest1, rest2], [indexer]);
    const matched = pairs.filter((p) => p.indexerRow);
    expect(matched).toHaveLength(1);
  });

  it("differing composite fields do not match", () => {
    const rest = makeRest(1, { withdrawAmount: "50000" });
    const indexer = makeIndexer(99, {
      withdrawIdentifier: "zz",
      withdrawAmount: "25000",
    });
    const pairs = correlate([rest], [indexer]);
    expect(pairs[0].indexerRow).toBeNull();
    expect(pairs[1].indexerRow).toBe(indexer);
  });
});
