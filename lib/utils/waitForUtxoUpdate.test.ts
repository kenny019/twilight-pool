import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  serializeTxid,
  hasUtxoData,
  waitForUtxoUpdate,
} from "./waitForUtxoUpdate";

vi.mock("@/lib/api/zkos", () => ({
  queryUtxoForAddress: vi.fn(),
}));

import { queryUtxoForAddress } from "@/lib/api/zkos";
const mockQuery = vi.mocked(queryUtxoForAddress);

describe("serializeTxid", () => {
  it("serializes arrays via JSON.stringify", () => {
    expect(serializeTxid([1, 2, 3])).toBe("[1,2,3]");
  });

  it("produces equal strings for equal arrays", () => {
    expect(serializeTxid([10, 20])).toBe(serializeTxid([10, 20]));
  });
});

describe("hasUtxoData", () => {
  it("returns true for objects with txid property", () => {
    expect(hasUtxoData({ txid: [1], output_index: 0 })).toBe(true);
  });

  it("returns false for empty objects", () => {
    expect(hasUtxoData({} as any)).toBe(false);
  });

  it("returns false for null", () => {
    expect(hasUtxoData(null)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(hasUtxoData(undefined)).toBe(false);
  });
});

describe("waitForUtxoUpdate", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockQuery.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("succeeds when txid changes after minWait", async () => {
    const oldTxid = "[1,2]";
    let callCount = 0;
    mockQuery.mockImplementation(async () => {
      callCount++;
      if (callCount <= 4) return { txid: [1, 2], output_index: 0 };
      return { txid: [3, 4], output_index: 1 };
    });

    const promise = waitForUtxoUpdate("addr", oldTxid, {
      pollIntervalMs: 1000,
      minWaitMs: 5000,
      timeoutMs: 30000,
    });

    // Advance through polls - first 4 return same txid
    for (let i = 0; i < 5; i++) {
      await vi.advanceTimersByTimeAsync(1000);
    }
    // 5th call returns new txid, and we're past minWait
    await vi.advanceTimersByTimeAsync(1000);

    const result = await promise;
    expect(result.success).toBe(true);
  });

  it("enforces minWait even if txid changes immediately", async () => {
    mockQuery.mockResolvedValue({ txid: [9, 9], output_index: 0 });

    const promise = waitForUtxoUpdate("addr", "[1,1]", {
      pollIntervalMs: 100,
      minWaitMs: 5000,
      timeoutMs: 30000,
    });

    // txid changed immediately but minWait not met
    await vi.advanceTimersByTimeAsync(100);
    // Advance to just before minWait
    await vi.advanceTimersByTimeAsync(4800);
    // Now past minWait
    await vi.advanceTimersByTimeAsync(200);

    const result = await promise;
    expect(result.success).toBe(true);
  });

  it("times out when txid never changes", async () => {
    mockQuery.mockResolvedValue({ txid: [1, 2], output_index: 0 });

    const promise = waitForUtxoUpdate("addr", "[1,2]", {
      pollIntervalMs: 1000,
      minWaitMs: 1000,
      timeoutMs: 5000,
    });

    await vi.advanceTimersByTimeAsync(6000);

    const result = await promise;
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.message).toContain("did not update");
    }
  });

  it("retries on query throw", async () => {
    mockQuery
      .mockRejectedValueOnce(new Error("network"))
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValue({ txid: [5, 5], output_index: 0 });

    const promise = waitForUtxoUpdate("addr", "[1,1]", {
      pollIntervalMs: 100,
      minWaitMs: 0,
      timeoutMs: 5000,
    });

    await vi.advanceTimersByTimeAsync(100);
    await vi.advanceTimersByTimeAsync(100);
    await vi.advanceTimersByTimeAsync(100);

    const result = await promise;
    expect(result.success).toBe(true);
  });

  it("retries on empty object response", async () => {
    mockQuery
      .mockResolvedValueOnce({} as any)
      .mockResolvedValue({ txid: [7, 7], output_index: 0 });

    const promise = waitForUtxoUpdate("addr", "[1,1]", {
      pollIntervalMs: 100,
      minWaitMs: 0,
      timeoutMs: 5000,
    });

    await vi.advanceTimersByTimeAsync(100);
    await vi.advanceTimersByTimeAsync(100);

    const result = await promise;
    expect(result.success).toBe(true);
  });
});
