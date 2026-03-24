import { describe, expect, it, beforeEach } from "vitest";
import { createTwilightStore } from "../store";
import { createLocalStorageStub } from "@/lib/__test__/localStorage";
import { TradeOrder } from "@/lib/types";

function makeTrade(overrides: Partial<TradeOrder> = {}): TradeOrder {
  return {
    accountAddress: "addr1",
    value: 1000,
    uuid: "uuid-1",
    orderStatus: "FILLED",
    orderType: "MARKET",
    output: undefined,
    tx_hash: "tx-1",
    positionType: "LONG",
    entryPrice: 50000,
    leverage: 5,
    date: new Date("2026-01-01"),
    isOpen: true,
    availableMargin: 100,
    feeFilled: 0,
    feeSettled: 0,
    bankruptcyPrice: 0,
    bankruptcyValue: 0,
    entryNonce: 1,
    entrySequence: 1,
    executionPrice: 50000,
    initialMargin: 200,
    liquidationPrice: 40000,
    maintenanceMargin: 50,
    positionSize: 1000,
    settlementPrice: 0,
    settleLimit: null,
    fundingApplied: null,
    ...overrides,
  };
}

describe("TradeSlice", () => {
  let store: ReturnType<typeof createTwilightStore>;

  beforeEach(() => {
    globalThis.localStorage = createLocalStorageStub() as any;
    store = createTwilightStore("test-trade-");
  });

  it("addTrade: adds new trade", () => {
    const trade = makeTrade();
    store.getState().trade.addTrade(trade);
    expect(store.getState().trade.trades).toHaveLength(1);
    expect(store.getState().trade.trades[0].uuid).toBe("uuid-1");
  });

  it("addTrade: upserts existing trade by uuid", () => {
    const trade = makeTrade();
    store.getState().trade.addTrade(trade);
    store.getState().trade.addTrade(makeTrade({ uuid: "uuid-1", value: 2000 }));
    expect(store.getState().trade.trades).toHaveLength(1);
    expect(store.getState().trade.trades[0].value).toBe(2000);
  });

  it("removeTrade: sets isOpen=false (does not remove)", () => {
    const trade = makeTrade();
    store.getState().trade.addTrade(trade);
    store.getState().trade.removeTrade(trade);
    expect(store.getState().trade.trades).toHaveLength(1);
    expect(store.getState().trade.trades[0].isOpen).toBe(false);
  });

  it("updateTrade: updates trade by uuid", () => {
    store.getState().trade.addTrade(makeTrade());
    store.getState().trade.updateTrade(makeTrade({ uuid: "uuid-1", value: 5000 }));
    expect(store.getState().trade.trades[0].value).toBe(5000);
  });

  it("updateTrade: no-op on missing uuid", () => {
    store.getState().trade.addTrade(makeTrade());
    store.getState().trade.updateTrade(makeTrade({ uuid: "missing" }));
    expect(store.getState().trade.trades).toHaveLength(1);
    expect(store.getState().trade.trades[0].uuid).toBe("uuid-1");
  });

  it("setNewTrades: deduplicates via Map by uuid", () => {
    store.getState().trade.addTrade(makeTrade({ uuid: "a" }));
    store.getState().trade.addTrade(makeTrade({ uuid: "b" }));
    store
      .getState()
      .trade.setNewTrades([makeTrade({ uuid: "a", value: 9999 }), makeTrade({ uuid: "c" })]);
    const uuids = store.getState().trade.trades.map((t) => t.uuid);
    expect(uuids).toContain("a");
    expect(uuids).toContain("b");
    expect(uuids).toContain("c");
    const tradeA = store.getState().trade.trades.find((t) => t.uuid === "a");
    expect(tradeA?.value).toBe(9999);
  });

  it("setNewTrades: skips update when JSON.stringify matches", () => {
    const trade = makeTrade();
    store.getState().trade.addTrade(trade);
    const before = store.getState().trade.trades;
    store.getState().trade.setNewTrades([trade]);
    const after = store.getState().trade.trades;
    // Should be the same reference since no change
    expect(after).toBe(before);
  });

  it("setNewTrades: overwrites by uuid", () => {
    store.getState().trade.addTrade(makeTrade({ uuid: "x", value: 100 }));
    store.getState().trade.setNewTrades([makeTrade({ uuid: "x", value: 200 })]);
    expect(store.getState().trade.trades.find((t) => t.uuid === "x")?.value).toBe(200);
  });

  it("updateTradeFundingHistory: sets history on matching trade", () => {
    store.getState().trade.addTrade(makeTrade());
    const history = [
      {
        time: "2026-01-01",
        position_side: "LONG",
        payment: "100",
        funding_rate: "0.01",
        order_id: "uuid-1",
      },
    ];
    store.getState().trade.updateTradeFundingHistory("uuid-1", history);
    expect(store.getState().trade.trades[0].fundingHistory).toEqual(history);
  });

  it("updateTradeFundingHistory: no-op on missing uuid", () => {
    store.getState().trade.addTrade(makeTrade());
    store.getState().trade.updateTradeFundingHistory("missing", []);
    expect(store.getState().trade.trades[0].fundingHistory).toBeUndefined();
  });

  it("resetState: clears trades", () => {
    store.getState().trade.addTrade(makeTrade());
    store.getState().trade.resetState();
    expect(store.getState().trade.trades).toEqual([]);
  });
});
