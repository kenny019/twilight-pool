import { describe, expect, it } from "vitest";
import {
  median,
  periodReturnFromApy,
  formatReturnPct,
  formatUtilizationPct,
  getUtilSeverity,
  getNetDirection,
} from "./lend-metrics";

describe("median", () => {
  it("returns null for empty array", () => {
    expect(median([])).toBeNull();
  });

  it("returns middle value for odd-length array", () => {
    expect(median([1, 2, 3])).toBe(2);
  });

  it("returns average of two middle values for even-length array", () => {
    expect(median([1, 2, 3, 4])).toBe(2.5);
  });

  it("handles unsorted input", () => {
    expect(median([5, 1, 3])).toBe(3);
  });

  it("uses n param to slice last n elements", () => {
    expect(median([10, 20, 1, 2, 3], 3)).toBe(2);
  });
});

describe("periodReturnFromApy", () => {
  it("calculates standard period return", () => {
    const result = periodReturnFromApy(10, 365);
    expect(result).toBeCloseTo(0.1, 5);
  });

  it("returns 0 for zero APY", () => {
    expect(periodReturnFromApy(0, 30)).toBe(0);
  });

  it("handles negative APY", () => {
    const result = periodReturnFromApy(-5, 365);
    expect(result).toBeCloseTo(-0.05, 5);
  });
});

describe("formatReturnPct", () => {
  it("formats positive return with + prefix", () => {
    expect(formatReturnPct(0.05)).toBe("+5.00%");
  });

  it("formats negative return with - prefix", () => {
    expect(formatReturnPct(-0.03)).toBe("-3.00%");
  });

  it("formats zero return with + prefix", () => {
    expect(formatReturnPct(0)).toBe("+0.00%");
  });
});

describe("formatUtilizationPct", () => {
  it("treats decimal input as fraction (<=1 → multiply by 100)", () => {
    expect(formatUtilizationPct(0.75)).toBe("75.0%");
  });

  it("treats value >1 as already percentage", () => {
    expect(formatUtilizationPct(85)).toBe("85.0%");
  });
});

describe("getUtilSeverity", () => {
  it("returns LOW below 30", () => {
    expect(getUtilSeverity(10)).toBe("LOW");
  });

  it("returns MEDIUM between 30 and 70", () => {
    expect(getUtilSeverity(50)).toBe("MEDIUM");
  });

  it("returns HIGH at 70+", () => {
    expect(getUtilSeverity(80)).toBe("HIGH");
  });

  it("returns null for NaN", () => {
    expect(getUtilSeverity(NaN)).toBeNull();
  });
});

describe("getNetDirection", () => {
  it("returns NEUTRAL for near-zero", () => {
    expect(getNetDirection(0.00005)).toBe("NEUTRAL");
  });

  it("returns LONG for positive", () => {
    expect(getNetDirection(1)).toBe("LONG");
  });

  it("returns SHORT for negative", () => {
    expect(getNetDirection(-1)).toBe("SHORT");
  });
});
