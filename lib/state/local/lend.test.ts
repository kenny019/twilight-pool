import { describe, expect, it, beforeEach } from "vitest";
import { createTwilightStore } from "../store";
import { createLocalStorageStub } from "@/lib/__test__/localStorage";
import { LendOrder } from "@/lib/types";

function makeLend(overrides: Partial<LendOrder> = {}): LendOrder {
  return {
    accountAddress: "addr1",
    value: 500,
    uuid: "lend-1",
    orderStatus: "LENDED",
    timestamp: new Date("2026-01-01"),
    ...overrides,
  };
}

describe("LendSlice", () => {
  let store: ReturnType<typeof createTwilightStore>;

  beforeEach(() => {
    globalThis.localStorage = createLocalStorageStub() as any;
    store = createTwilightStore("test-lend-");
  });

  it("addLend: adds to array (no dedup)", () => {
    store.getState().lend.addLend(makeLend());
    store.getState().lend.addLend(makeLend({ uuid: "lend-1" }));
    // addLend does NOT deduplicate — both are added
    expect(store.getState().lend.lends).toHaveLength(2);
  });

  it("updateLend: updates by uuid", () => {
    store.getState().lend.addLend(makeLend());
    store.getState().lend.updateLend("lend-1", { value: 999 });
    expect(store.getState().lend.lends[0].value).toBe(999);
  });

  it("updateLend: no-op on missing uuid", () => {
    store.getState().lend.addLend(makeLend());
    store.getState().lend.updateLend("missing", { value: 999 });
    expect(store.getState().lend.lends[0].value).toBe(500);
  });

  it("removeLend: filters by uuid (not accountAddress)", () => {
    store.getState().lend.addLend(makeLend({ uuid: "a", accountAddress: "shared" }));
    store.getState().lend.addLend(makeLend({ uuid: "b", accountAddress: "shared" }));
    store.getState().lend.removeLend(makeLend({ uuid: "a", accountAddress: "shared" }));
    expect(store.getState().lend.lends).toHaveLength(1);
    expect(store.getState().lend.lends[0].uuid).toBe("b");
  });

  it("removeLend: keeps other lends with same accountAddress", () => {
    store.getState().lend.addLend(makeLend({ uuid: "x", accountAddress: "same-addr" }));
    store.getState().lend.addLend(makeLend({ uuid: "y", accountAddress: "same-addr" }));
    store.getState().lend.removeLend(makeLend({ uuid: "x", accountAddress: "same-addr" }));
    const remaining = store.getState().lend.lends;
    expect(remaining).toHaveLength(1);
    expect(remaining[0].uuid).toBe("y");
    expect(remaining[0].accountAddress).toBe("same-addr");
  });

  it("addLendHistory + removeLendHistory: filters by uuid", () => {
    store.getState().lend.addLendHistory(makeLend({ uuid: "h1", accountAddress: "shared" }));
    store.getState().lend.addLendHistory(makeLend({ uuid: "h2", accountAddress: "shared" }));
    store.getState().lend.removeLendHistory(makeLend({ uuid: "h1", accountAddress: "shared" }));
    expect(store.getState().lend.lendHistory).toHaveLength(1);
    expect(store.getState().lend.lendHistory[0].uuid).toBe("h2");
  });

  it("setPoolInfo: sets pool info", () => {
    store.getState().lend.setPoolInfo({ apy: 5, tvl_btc: 100, pool_share: 0.5 });
    expect(store.getState().lend.poolInfo).toEqual({
      apy: 5,
      tvl_btc: 100,
      pool_share: 0.5,
    });
  });

  it("resetState: clears lends, lendHistory, poolInfo", () => {
    store.getState().lend.addLend(makeLend());
    store.getState().lend.addLendHistory(makeLend());
    store.getState().lend.setPoolInfo({ apy: 5, tvl_btc: 100, pool_share: 0.5 });
    store.getState().lend.resetState();
    expect(store.getState().lend.lends).toEqual([]);
    expect(store.getState().lend.lendHistory).toEqual([]);
    expect(store.getState().lend.poolInfo).toBeNull();
  });
});
