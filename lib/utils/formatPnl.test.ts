import { describe, expect, it, vi } from "vitest";
import { getPnlUsdValue, formatPnlWithUsd } from "./formatPnl";
import { formatCurrency } from "@/lib/twilight/ticker";

vi.mock("@/lib/twilight/ticker", () => ({
  formatCurrency: vi.fn((val: number) => `$${val.toFixed(2)}`),
}));

const mockFormatCurrency = vi.mocked(formatCurrency);

describe("getPnlUsdValue", () => {
  it("converts 1 BTC pnl at $50k", () => {
    expect(getPnlUsdValue(100_000_000, 50_000)).toBe(50_000);
  });

  it("handles 1 sat precision", () => {
    const result = getPnlUsdValue(1, 50_000);
    expect(result).toBeCloseTo(0.0005, 6);
  });

  it("returns 0 when btcPrice <= 0", () => {
    expect(getPnlUsdValue(100_000_000, 0)).toBe(0);
    expect(getPnlUsdValue(100_000_000, -100)).toBe(0);
  });

  it("handles negative pnl", () => {
    expect(getPnlUsdValue(-100_000_000, 50_000)).toBe(-50_000);
  });
});

describe("formatPnlWithUsd", () => {
  it("passes correct value to formatCurrency", () => {
    formatPnlWithUsd(100_000_000, 50_000);
    expect(mockFormatCurrency).toHaveBeenCalledWith(50_000);
  });

  it("returns formatted string", () => {
    const result = formatPnlWithUsd(100_000_000, 50_000);
    expect(result).toBe("$50000.00");
  });
});
