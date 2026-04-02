import { describe, expect, it } from "vitest";
import { TradeOrder, ZkAccount } from "../types";
import {
  buildManualRecoveryTransferAccount,
  buildPersistedTerminalTradeAccount,
  shouldNotifyCleanupFailure,
  shouldPersistTerminalTradeAccount,
} from "./tradeRecovery";

function makeZkAccount(overrides: Partial<ZkAccount> = {}): ZkAccount {
  return {
    tag: "BTC trade 1",
    address: "addr-1",
    scalar: "scalar-1",
    type: "Memo",
    isOnChain: true,
    value: 1000,
    ...overrides,
  };
}

function makeTrade(overrides: Partial<TradeOrder> = {}): TradeOrder {
  return {
    accountAddress: "addr-1",
    value: 1000,
    uuid: "trade-1",
    orderStatus: "FILLED",
    orderType: "MARKET",
    tx_hash: "tx-1",
    positionType: "LONG",
    entryPrice: 100,
    leverage: 2,
    date: new Date("2026-01-01T00:00:00Z"),
    isOpen: true,
    availableMargin: 900,
    feeFilled: 0,
    feeSettled: 0,
    bankruptcyPrice: 0,
    bankruptcyValue: 0,
    entryNonce: 1,
    entrySequence: 1,
    executionPrice: 100,
    initialMargin: 1000,
    liquidationPrice: 0,
    maintenanceMargin: 0,
    positionSize: 1,
    settlementPrice: 0,
    fundingApplied: null,
    settleLimit: null,
    ...overrides,
  };
}

describe("buildPersistedTerminalTradeAccount", () => {
  it("builds a CoinSettled account for settled trades", () => {
    const current = makeZkAccount({ type: "Memo", value: 1000 });

    expect(
      buildPersistedTerminalTradeAccount({
        currentAccount: current,
        orderStatus: "SETTLED",
        availableMargin: 1234.6,
      })
    ).toEqual({
      ...current,
      type: "CoinSettled",
      value: 1235,
    });
  });

  it("builds a Coin account for cancelled trades", () => {
    const current = makeZkAccount({ type: "Memo", value: 1000 });

    expect(
      buildPersistedTerminalTradeAccount({
        currentAccount: current,
        orderStatus: "CANCELLED",
        availableMargin: 876.2,
      })
    ).toEqual({
      ...current,
      type: "Coin",
      value: 876,
    });
  });
});

describe("shouldPersistTerminalTradeAccount", () => {
  it("returns false when type and value already match", () => {
    const current = makeZkAccount({ type: "CoinSettled", value: 1500 });
    const next = makeZkAccount({ type: "CoinSettled", value: 1500 });

    expect(shouldPersistTerminalTradeAccount(current, next)).toBe(false);
  });

  it("returns true when type or value changes", () => {
    const current = makeZkAccount({ type: "Memo", value: 1000 });
    const next = makeZkAccount({ type: "CoinSettled", value: 1200 });

    expect(shouldPersistTerminalTradeAccount(current, next)).toBe(true);
  });
});

describe("buildManualRecoveryTransferAccount", () => {
  it("uses availableMargin for settled trades", () => {
    const zkAccount = makeZkAccount({ value: 4000 });
    const trade = makeTrade({
      orderStatus: "SETTLED",
      availableMargin: 2500.7,
    });

    expect(
      buildManualRecoveryTransferAccount({
        zkAccount,
        trade,
      })
    ).toEqual({
      ...zkAccount,
      value: 2501,
    });
  });

  it("uses availableMargin for cancelled trades", () => {
    const zkAccount = makeZkAccount({ value: 4000 });
    const trade = makeTrade({
      orderStatus: "CANCELLED",
      availableMargin: 1800.2,
    });

    expect(
      buildManualRecoveryTransferAccount({
        zkAccount,
        trade,
      })
    ).toEqual({
      ...zkAccount,
      value: 1800,
    });
  });

  it("falls back to zkAccount.value for non-terminal trades", () => {
    const zkAccount = makeZkAccount({ value: 4000 });
    const trade = makeTrade({ orderStatus: "FILLED", availableMargin: 2500 });

    expect(
      buildManualRecoveryTransferAccount({
        zkAccount,
        trade,
      })
    ).toEqual({
      ...zkAccount,
      value: 4000,
    });
  });

  it("falls back to zkAccount.value when there is no trade", () => {
    const zkAccount = makeZkAccount({ value: 3210 });

    expect(
      buildManualRecoveryTransferAccount({
        zkAccount,
      })
    ).toEqual({
      ...zkAccount,
      value: 3210,
    });
  });
});

describe("shouldNotifyCleanupFailure", () => {
  it("only notifies once per account", () => {
    const notified = new Set<string>();

    expect(shouldNotifyCleanupFailure(notified, "addr-1")).toBe(true);
    expect(shouldNotifyCleanupFailure(notified, "addr-1")).toBe(false);
    expect(shouldNotifyCleanupFailure(notified, "addr-2")).toBe(true);
  });
});
