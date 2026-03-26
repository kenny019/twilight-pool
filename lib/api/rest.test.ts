import { describe, expect, it } from "vitest";
import { isErrorStatus, isCancelStatus } from "./rest";

describe("isErrorStatus", () => {
  it.each([
    "RejectedByRiskEngine",
    "RejectedByExchange",
    "RejectedByRelayer",
    "Error",
  ])("returns true for %s", (status) => {
    expect(isErrorStatus(status)).toBe(true);
  });

  it.each(["FILLED", "PENDING", "SETTLED", "CANCELLED"])(
    "returns false for %s",
    (status) => {
      expect(isErrorStatus(status)).toBe(false);
    }
  );
});

describe("isCancelStatus", () => {
  it.each([
    "CANCELLED",
    "CancelledStopLoss",
    "CancelledTakeProfit",
    "CancelledLimitClose",
  ])("returns true for %s", (status) => {
    expect(isCancelStatus(status)).toBe(true);
  });

  it.each(["FILLED", "PENDING", "SETTLED", "Error"])(
    "returns false for %s",
    (status) => {
      expect(isCancelStatus(status)).toBe(false);
    }
  );
});
