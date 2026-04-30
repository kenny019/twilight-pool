import { describe, expect, it } from "vitest";
import { mergeRestRowsWithStore } from "./withdrawalCorrelation";
import type { WithdrawRequest } from "../api/rest";

const makeRest = (
  identifier: number,
  overrides: Partial<WithdrawRequest> = {}
): WithdrawRequest => ({
  withdrawIdentifier: identifier,
  withdrawAddress: "bc1qdest",
  withdrawReserveId: "1",
  withdrawAmount: "50000",
  twilightAddress: "twilight1user",
  isConfirmed: false,
  CreationTwilightBlockHeight: String(identifier * 10),
  ...overrides,
});

describe("mergeRestRowsWithStore", () => {
  it("returns REST rows untouched when the store is empty", () => {
    const out = mergeRestRowsWithStore(
      [makeRest(1), makeRest(2)],
      []
    );
    expect(out).toHaveLength(2);
    expect(out[0].txHash).toBeUndefined();
    expect(out[1].txHash).toBeUndefined();
  });

  it("attaches the matching tx_hash by tuple", () => {
    const out = mergeRestRowsWithStore(
      [makeRest(7)],
      [
        {
          tx_hash: "abc123",
          created_at: 1000,
          amount: 50000,
          withdrawAddress: "bc1qdest",
          reserveId: 1,
        },
      ]
    );
    expect(out[0].txHash).toBe("abc123");
  });

  it("FIFO-pairs repeated tuples in chain order, regardless of REST input order", () => {
    // User submits two identical-tuple withdrawals in order.
    const store = [
      {
        tx_hash: "older-hash",
        created_at: 1000,
        amount: 50000,
        withdrawAddress: "bc1qdest",
        reserveId: 1,
      },
      {
        tx_hash: "newer-hash",
        created_at: 2000,
        amount: 50000,
        withdrawAddress: "bc1qdest",
        reserveId: 1,
      },
    ];

    // REST returns the rows out of order — newer identifier first.
    const restOutOfOrder = [makeRest(20), makeRest(10)];

    const out = mergeRestRowsWithStore(restOutOfOrder, store);

    // Output is sorted by withdrawIdentifier ASC.
    expect(out.map((r) => Number(r.withdrawIdentifier))).toEqual([10, 20]);
    // Older REST row gets the older store entry's hash.
    expect(out[0].txHash).toBe("older-hash");
    expect(out[1].txHash).toBe("newer-hash");
  });

  it("respects store created_at ordering even if the array is reverse-sorted", () => {
    const store = [
      {
        tx_hash: "newer-hash",
        created_at: 2000,
        amount: 50000,
        withdrawAddress: "bc1qdest",
        reserveId: 1,
      },
      {
        tx_hash: "older-hash",
        created_at: 1000,
        amount: 50000,
        withdrawAddress: "bc1qdest",
        reserveId: 1,
      },
    ];

    const out = mergeRestRowsWithStore([makeRest(10), makeRest(20)], store);

    expect(out[0].txHash).toBe("older-hash");
    expect(out[1].txHash).toBe("newer-hash");
  });

  it("leaves unmatched REST rows with undefined txHash", () => {
    const out = mergeRestRowsWithStore(
      [makeRest(1), makeRest(2, { withdrawAmount: "99999" })],
      [
        {
          tx_hash: "match-hash",
          created_at: 1000,
          amount: 50000,
          withdrawAddress: "bc1qdest",
          reserveId: 1,
        },
      ]
    );
    expect(out[0].txHash).toBe("match-hash");
    expect(out[1].txHash).toBeUndefined();
  });

  it("does not double-consume a single store entry", () => {
    const store = [
      {
        tx_hash: "only-hash",
        created_at: 1000,
        amount: 50000,
        withdrawAddress: "bc1qdest",
        reserveId: 1,
      },
    ];

    const out = mergeRestRowsWithStore([makeRest(1), makeRest(2)], store);
    expect(out[0].txHash).toBe("only-hash");
    expect(out[1].txHash).toBeUndefined();
  });
});
