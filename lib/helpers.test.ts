import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  calculateAPR,
  retry,
  safeJSONParse,
  isUserRejection,
  formatSatsMBtc,
  formatSatsCompact,
  truncateHash,
  capitaliseFirstLetter,
} from "./helpers";

describe("calculateAPR", () => {
  it("returns NaN for zero principal", () => {
    expect(calculateAPR({ rewards: 10, principal: 0, timeElapsedSeconds: 1000 })).toBeNaN();
  });

  it("returns NaN for negative principal", () => {
    expect(calculateAPR({ rewards: 10, principal: -5, timeElapsedSeconds: 1000 })).toBeNaN();
  });

  it("returns NaN for zero timeElapsed", () => {
    expect(calculateAPR({ rewards: 10, principal: 100, timeElapsedSeconds: 0 })).toBeNaN();
  });

  it("returns 0 for negligible return ratio (<1e-6)", () => {
    expect(calculateAPR({ rewards: 0.00005, principal: 100, timeElapsedSeconds: 86400 })).toBe(0);
  });

  it("uses 7-day minimum annualization window", () => {
    const sevenDays = 7 * 24 * 60 * 60;
    const shortTime = 100;
    const a = calculateAPR({ rewards: 10, principal: 100, timeElapsedSeconds: shortTime });
    const b = calculateAPR({ rewards: 10, principal: 100, timeElapsedSeconds: sevenDays });
    // Short time should be clamped to 7 days, so both should be equal
    expect(a).toBe(b);
  });

  it("calculates standard case correctly", () => {
    const oneYear = 31_536_000;
    const result = calculateAPR({ rewards: 10, principal: 100, timeElapsedSeconds: oneYear });
    expect(result).toBeCloseTo(10, 5); // 10%
  });

  it("returns negative ARR for negative rewards", () => {
    const oneYear = 31_536_000;
    const result = calculateAPR({ rewards: -5, principal: 100, timeElapsedSeconds: oneYear });
    expect(result).toBeCloseTo(-5, 5);
  });
});

describe("retry", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns on first-try success", async () => {
    const query = vi.fn().mockResolvedValue("ok");
    const promise = retry(query, 3, undefined, 100);
    const result = await promise;
    expect(result).toEqual({ success: true, data: "ok" });
    expect(query).toHaveBeenCalledTimes(1);
  });

  it("retries when query returns null", async () => {
    const query = vi.fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce("found");

    const promise = retry(query, 3, undefined, 100);

    // Advance through the sleeps for retries on null
    await vi.advanceTimersByTimeAsync(100);
    await vi.advanceTimersByTimeAsync(100);

    const result = await promise;
    expect(result).toEqual({ success: true, data: "found" });
  });

  it("uses condition callback to determine success", async () => {
    const query = vi.fn()
      .mockResolvedValueOnce({ status: "pending" })
      .mockResolvedValueOnce({ status: "done" });

    const condition = (data: any) => data.status === "done";
    const promise = retry(query, 3, undefined, 100, condition);

    await vi.advanceTimersByTimeAsync(100);

    const result = await promise;
    expect(result).toEqual({ success: true, data: { status: "done" } });
  });

  it("returns cancelled when failCondition matches", async () => {
    const query = vi.fn().mockResolvedValue({ status: "CANCELLED" });
    const failCondition = (data: any) => data.status === "CANCELLED";

    const result = await retry(query, 3, undefined, 100, undefined, failCondition);
    expect(result).toEqual({ success: false, cancelled: true });
  });

  it("returns failure when retries are exhausted and condition never met", async () => {
    const query = vi.fn().mockResolvedValue({ status: "pending" });
    const condition = (data: any) => data.status === "done";
    const promise = retry(query, 2, undefined, 100, condition);

    await vi.advanceTimersByTimeAsync(100);
    await vi.advanceTimersByTimeAsync(100);

    const result = await promise;
    expect(result).toEqual({ success: false });
  });

  it("breaks on query throw and returns failure", async () => {
    const query = vi.fn().mockRejectedValue(new Error("network"));
    const result = await retry(query, 3, undefined, 100);
    expect(result).toEqual({ success: false });
  });
});

describe("safeJSONParse", () => {
  it("parses valid JSON", () => {
    expect(safeJSONParse('{"a":1}')).toEqual({ success: true, data: { a: 1 } });
  });

  it("returns failure for invalid JSON", () => {
    const result = safeJSONParse("not json");
    expect(result.success).toBe(false);
  });
});

describe("isUserRejection", () => {
  it("matches Error with rejection message", () => {
    expect(isUserRejection(new Error("request rejected by user"))).toBe(true);
  });

  it("matches string with rejection message", () => {
    expect(isUserRejection("user denied the transaction")).toBe(true);
  });

  it("returns false for non-matching error", () => {
    expect(isUserRejection(new Error("network timeout"))).toBe(false);
  });

  it("returns false for non-string input", () => {
    expect(isUserRejection(42)).toBe(false);
    expect(isUserRejection(null)).toBe(false);
  });
});

describe("formatSatsMBtc", () => {
  it("converts sats to mBTC", () => {
    expect(formatSatsMBtc(100_000)).toBe("1");
    expect(formatSatsMBtc(150_000)).toBe("1.5");
  });

  it("returns '0' for NaN", () => {
    expect(formatSatsMBtc(NaN)).toBe("0");
  });

  it("returns '0' for negative zero", () => {
    expect(formatSatsMBtc(-0.00001)).toBe("0");
  });

  it("strips trailing zeros", () => {
    expect(formatSatsMBtc(200_000)).toBe("2");
  });
});

describe("formatSatsCompact", () => {
  it("formats small amounts as sats", () => {
    expect(formatSatsCompact(500)).toBe("500 sats");
  });

  it("formats medium amounts as mBTC", () => {
    expect(formatSatsCompact(200_000)).toBe("2 mBTC");
  });

  it("formats large amounts as BTC", () => {
    expect(formatSatsCompact(100_000_000)).toBe("1 BTC");
  });

  it("uses + prefix when signed and positive", () => {
    expect(formatSatsCompact(500, { signed: true })).toBe("+500 sats");
  });

  it("returns '0 BTC' for NaN", () => {
    expect(formatSatsCompact(NaN)).toBe("0 BTC");
  });

  it("negative values always get '-' prefix regardless of signed flag", () => {
    expect(formatSatsCompact(-500)).toBe("-500 sats");
    expect(formatSatsCompact(-500, { signed: false })).toBe("-500 sats");
  });
});

describe("truncateHash", () => {
  it("returns short hash as-is", () => {
    expect(truncateHash("abcd1234")).toBe("abcd1234");
  });

  it("returns empty string for null", () => {
    expect(truncateHash(null)).toBe("");
    expect(truncateHash(undefined)).toBe("");
  });

  it("truncates long hash", () => {
    const hash = "abcdefghijklmnopqrstuvwxyz1234567890";
    const result = truncateHash(hash);
    expect(result).toBe("abcdefgh...34567890");
  });
});

describe("capitaliseFirstLetter", () => {
  it("capitalises first letter and lowercases rest", () => {
    expect(capitaliseFirstLetter("hello")).toBe("Hello");
    expect(capitaliseFirstLetter("HELLO")).toBe("Hello");
  });
});
