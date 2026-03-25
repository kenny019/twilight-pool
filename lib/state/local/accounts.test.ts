import { describe, expect, it, beforeEach } from "vitest";
import { createTwilightStore } from "../store";
import { createLocalStorageStub } from "@/lib/__test__/localStorage";
import { ZkAccount } from "@/lib/types";

function makeAccount(overrides: Partial<ZkAccount> = {}): ZkAccount {
  return {
    tag: "main",
    address: "addr-1",
    scalar: "scalar-1",
    type: "Coin",
    isOnChain: true,
    value: 1000,
    ...overrides,
  };
}

describe("ZkAccountSlice", () => {
  let store: ReturnType<typeof createTwilightStore>;

  beforeEach(() => {
    globalThis.localStorage = createLocalStorageStub() as any;
    store = createTwilightStore("test-zk-");
  });

  it("addZkAccount: adds new account", () => {
    store.getState().zk.addZkAccount(makeAccount());
    expect(store.getState().zk.zkAccounts).toHaveLength(1);
    expect(store.getState().zk.zkAccounts[0].address).toBe("addr-1");
  });

  it("addZkAccount: upserts by address", () => {
    store.getState().zk.addZkAccount(makeAccount());
    store.getState().zk.addZkAccount(makeAccount({ address: "addr-1", value: 2000 }));
    expect(store.getState().zk.zkAccounts).toHaveLength(1);
    expect(store.getState().zk.zkAccounts[0].value).toBe(2000);
  });

  it("updateZkAccount: replaces account by address", () => {
    store.getState().zk.addZkAccount(makeAccount());
    store.getState().zk.updateZkAccount("addr-1", makeAccount({ value: 5000 }));
    expect(store.getState().zk.zkAccounts[0].value).toBe(5000);
  });

  it("updateZkAccount: no-op on address mismatch", () => {
    store.getState().zk.addZkAccount(makeAccount());
    store.getState().zk.updateZkAccount("wrong-addr", makeAccount({ value: 5000 }));
    expect(store.getState().zk.zkAccounts[0].value).toBe(1000);
  });

  it("removeZkAccount: filters by address", () => {
    store.getState().zk.addZkAccount(makeAccount({ address: "a" }));
    store.getState().zk.addZkAccount(makeAccount({ address: "b" }));
    store.getState().zk.removeZkAccount(makeAccount({ address: "a" }));
    expect(store.getState().zk.zkAccounts).toHaveLength(1);
    expect(store.getState().zk.zkAccounts[0].address).toBe("b");
  });

  it("setMasterAccountRecovery: sets blocked state", () => {
    store.getState().zk.setMasterAccountRecovery({
      address: "recovery-addr",
      scalar: "s",
      value: 100,
      source: "test",
      createdAt: 1000,
    });
    expect(store.getState().zk.masterAccountBlocked).toBe(true);
    expect(store.getState().zk.masterAccountBlockReason).toContain("recovery is in progress");
    expect(store.getState().zk.pendingMasterAccount).toBeDefined();
  });

  it("clearMasterAccountRecovery: clears blocked state", () => {
    store.getState().zk.setMasterAccountRecovery({
      address: "r",
      scalar: "s",
      value: 0,
      source: "test",
      createdAt: 1,
    });
    store.getState().zk.clearMasterAccountRecovery();
    expect(store.getState().zk.masterAccountBlocked).toBe(false);
    expect(store.getState().zk.masterAccountBlockReason).toBeNull();
    expect(store.getState().zk.pendingMasterAccount).toBeNull();
  });

  it("recovery flow: set → clear → verify clean state", () => {
    store.getState().zk.setMasterAccountRecovery({
      address: "r",
      scalar: "s",
      value: 50,
      source: "flow test",
      createdAt: 2,
    });
    expect(store.getState().zk.masterAccountBlocked).toBe(true);

    store.getState().zk.clearMasterAccountRecovery();
    expect(store.getState().zk.masterAccountBlocked).toBe(false);
    expect(store.getState().zk.pendingMasterAccount).toBeNull();
  });

  it("updateBlockHeight: updates blockHeight", () => {
    store.getState().zk.updateBlockHeight(42);
    expect(store.getState().zk.blockHeight).toBe(42);
  });

  it("resetState: clears accounts and blocked state", () => {
    store.getState().zk.addZkAccount(makeAccount());
    store.getState().zk.setMasterAccountRecovery({
      address: "r",
      scalar: "s",
      value: 0,
      source: "test",
      createdAt: 1,
    });
    store.getState().zk.resetState();
    expect(store.getState().zk.zkAccounts).toEqual([]);
    expect(store.getState().zk.masterAccountBlocked).toBe(false);
    expect(store.getState().zk.pendingMasterAccount).toBeNull();
  });
});
