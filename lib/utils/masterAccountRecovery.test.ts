import { describe, expect, it, vi } from "vitest";
import {
  MasterAccountBlockedError,
  assertMasterAccountActionAllowed,
  createBlockedMasterAccountState,
  createPendingMasterAccountRecovery,
  getMasterAccountBlockedMessage,
  resolvePendingMasterAccount,
} from "./masterAccountRecovery";

describe("masterAccountRecovery", () => {
  it("creates a blocked recovery payload with a deterministic message", () => {
    const pending = createPendingMasterAccountRecovery({
      address: "main-next",
      scalar: "scalar-next",
      value: 42,
      source: "trade cleanup transfer",
      txId: "tx-1",
      createdAt: 123,
    });

    expect(pending).toEqual({
      address: "main-next",
      scalar: "scalar-next",
      value: 42,
      source: "trade cleanup transfer",
      txId: "tx-1",
      createdAt: 123,
    });

    expect(createBlockedMasterAccountState(pending)).toEqual({
      masterAccountBlocked: true,
      masterAccountBlockReason:
        "Trading account recovery is in progress after trade cleanup transfer. Please wait for recovery to finish before trying again.",
      pendingMasterAccount: pending,
    });
  });

  it("blocks future master-account actions while recovery is pending", () => {
    expect(() =>
      assertMasterAccountActionAllowed({
        masterAccountBlocked: true,
        masterAccountBlockReason: "blocked",
      })
    ).toThrow(MasterAccountBlockedError);

    expect(() =>
      assertMasterAccountActionAllowed({
        masterAccountBlocked: false,
        masterAccountBlockReason: null,
      })
    ).not.toThrow();
  });

  it("resolves the pending master account back into a visible on-chain account", () => {
    const resolved = resolvePendingMasterAccount(
      {
        tag: "main",
        type: "Coin",
        address: "old-main",
        scalar: "old-scalar",
        value: 10,
        isOnChain: false,
        createdAt: 99,
        zkAccountHex: "hex",
      },
      {
        address: "new-main",
        scalar: "new-scalar",
        value: 25,
        source: "market order funding transfer",
        createdAt: 200,
      }
    );

    expect(resolved).toEqual({
      tag: "main",
      type: "Coin",
      address: "new-main",
      scalar: "new-scalar",
      value: 25,
      isOnChain: true,
      createdAt: 99,
      zkAccountHex: "hex",
    });
  });

  it("uses the default recovery message when no custom reason is supplied", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-24T00:00:00Z"));

    const pending = createPendingMasterAccountRecovery({
      address: "main-next",
      scalar: "scalar-next",
      value: 100,
      source: "wallet transfer burn",
    });

    expect(pending.createdAt).toBe(new Date("2026-03-24T00:00:00Z").valueOf());
    expect(getMasterAccountBlockedMessage()).toBe(
      "Trading account recovery is in progress. Please wait for recovery to finish before trying again."
    );

    vi.useRealTimers();
  });
});
