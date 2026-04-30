import { describe, expect, it } from "vitest";
import { selectFetchTargets } from "./useWithdrawalTxStatuses";

const baseRest = {
  withdrawAddress: "bc1qdest",
  withdrawReserveId: "1",
  withdrawAmount: "1000",
};

describe("selectFetchTargets", () => {
  it("skips pairs with no txHash on the rest row", () => {
    const out = selectFetchTargets([
      {
        restRow: { ...baseRest, withdrawIdentifier: 1 },
        indexerRow: null,
      },
    ]);
    expect(out).toEqual([]);
  });

  it("skips pairs whose indexer row is already confirmed", () => {
    const out = selectFetchTargets([
      {
        restRow: {
          ...baseRest,
          withdrawIdentifier: 1,
          txHash: "abc123",
        },
        indexerRow: {
          id: 1,
          withdrawIdentifier: "1",
          twilightAddress: "twilight1u",
          withdrawAddress: "bc1qdest",
          withdrawReserveId: "1",
          blockHeight: 1,
          withdrawAmount: "1000",
          isConfirmed: true,
          createdAt: "2026-01-01T00:00:00Z",
        },
      },
    ]);
    expect(out).toEqual([]);
  });

  it("emits one target per active rest row with txHash", () => {
    const out = selectFetchTargets([
      {
        restRow: {
          ...baseRest,
          withdrawIdentifier: 5,
          txHash: "deadbeef",
        },
        indexerRow: null,
      },
      {
        restRow: {
          ...baseRest,
          withdrawIdentifier: 9,
          txHash: "feedface",
        },
        indexerRow: {
          id: 9,
          withdrawIdentifier: "9",
          twilightAddress: "twilight1u",
          withdrawAddress: "bc1qdest",
          withdrawReserveId: "1",
          blockHeight: 1,
          withdrawAmount: "1000",
          isConfirmed: false,
          createdAt: "2026-01-01T00:00:00Z",
        },
      },
    ]);
    expect(out).toEqual([
      { identifier: "5", hash: "deadbeef" },
      { identifier: "9", hash: "feedface" },
    ]);
  });
});
