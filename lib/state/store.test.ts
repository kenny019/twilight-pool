import { beforeEach, describe, expect, it } from "vitest";
import {
  ACCOUNT_STATE_VERSION,
  createTwilightStore,
  migrateAccountState,
} from "./store";
import { createLocalStorageStub } from "@/lib/__test__/localStorage";

const TEST_STORAGE_KEY = "test-twilight-store";

function seedPersistedAccountState(state: unknown, version: number) {
  globalThis.localStorage.setItem(
    TEST_STORAGE_KEY,
    JSON.stringify({
      state,
      version,
    })
  );
}

function readPersistedAccountState() {
  const raw = globalThis.localStorage.getItem(TEST_STORAGE_KEY);
  expect(raw).not.toBeNull();
  return JSON.parse(raw!);
}

async function rehydrateAccountState(state: unknown, version: number) {
  seedPersistedAccountState(state, version);
  const store = createTwilightStore(TEST_STORAGE_KEY);
  await store.persist.rehydrate();
  return store;
}

describe("migrateAccountState", () => {
  beforeEach(() => {
    globalThis.localStorage = createLocalStorageStub() as Storage;
  });

  it("hydrates a v0 payload through every later migration", async () => {
    const store = await rehydrateAccountState(
      {
        zk: { zkAccounts: [] },
        trade: {
          trades: [
            {
              uuid: "t1",
              fundingHistory: null,
              settleLimit: { position_type: "LONG", price: "50000" },
              takeProfit: {
                tp_price: "60000",
                position_type: "LONG",
                uuid: "tp-1",
                timestamp: "tp-ts",
              },
              stopLoss: {
                sl_price: "40000",
                position_type: "LONG",
                uuid: "sl-1",
                timestamp: "sl-ts",
              },
            },
          ],
        },
        trade_history: {
          trades: [
            {
              uuid: "t2",
              fundingHistory: null,
              takeProfit: {
                tp_price: "70000",
                position_type: "SHORT",
                uuid: "tp-2",
                timestamp: "hist-ts",
              },
              stopLoss: null,
            },
          ],
        },
      },
      0
    );

    const hydratedState = store.getState();
    const openTrade = hydratedState.trade.trades[0];
    const historicalTrade = hydratedState.trade_history.trades[0];

    expect(hydratedState.zk.blockHeight).toBe(0);
    expect(hydratedState.optInLeaderboard).toBe(false);
    expect(hydratedState.hasShownOptInDialog).toBe(false);

    expect(openTrade.entryPrice).toBe(0);
    expect(openTrade.fundingHistory).toBeUndefined();
    expect(openTrade.settleLimit?.timestamp).toBeUndefined();
    expect(openTrade.takeProfit).toEqual({
      price: "60000",
      position_type: "LONG",
      uuid: "tp-1",
      created_time: "tp-ts",
    });
    expect(openTrade.stopLoss).toEqual({
      price: "40000",
      position_type: "LONG",
      uuid: "sl-1",
      created_time: "sl-ts",
    });

    expect(historicalTrade.fundingHistory).toBeUndefined();
    expect(historicalTrade.takeProfit).toEqual({
      price: "70000",
      position_type: "SHORT",
      uuid: "tp-2",
      created_time: "hist-ts",
    });
    expect(historicalTrade.stopLoss).toBeUndefined();
  });

  it("hydrates a v0.6 payload by normalizing legacy SLTP fields", async () => {
    const store = await rehydrateAccountState(
      {
        trade: {
          trades: [
            {
              uuid: "t1",
              takeProfit: {
                tp_price: "61000",
                position_type: "LONG",
                uuid: "tp-1",
                timestamp: "tp-ts",
              },
              stopLoss: {
                sl_price: "39000",
                position_type: "LONG",
                uuid: "sl-1",
                created_time: "sl-ts",
              },
            },
          ],
        },
        trade_history: {
          trades: [
            {
              uuid: "t2",
              takeProfit: { price: "72000" },
              stopLoss: null,
            },
          ],
        },
      },
      0.6
    );

    expect(store.getState().trade.trades[0].takeProfit).toEqual({
      price: "61000",
      position_type: "LONG",
      uuid: "tp-1",
      created_time: "tp-ts",
    });
    expect(store.getState().trade.trades[0].stopLoss).toEqual({
      price: "39000",
      position_type: "LONG",
      uuid: "sl-1",
      created_time: "sl-ts",
    });
    expect(store.getState().trade_history.trades[0].takeProfit).toEqual({
      price: "72000",
      position_type: undefined,
      uuid: undefined,
      created_time: undefined,
    });
    expect(store.getState().trade_history.trades[0].stopLoss).toBeNull();
  });

  it("hard-resets newer persisted versions and rewrites storage", async () => {
    const store = await rehydrateAccountState(
      {
        trade: {
          trades: [{ uuid: "future-trade", entryPrice: 12345 }],
        },
        zk: {
          zkAccounts: [{ address: "future-account" }],
        },
      },
      999
    );

    expect(store.getState().trade.trades).toEqual([]);
    expect(store.getState().zk.zkAccounts).toEqual([]);

    const persisted = readPersistedAccountState();
    expect(persisted.version).toBe(ACCOUNT_STATE_VERSION);
    expect(persisted.state.trade.trades).toEqual([]);
    expect(persisted.state.zk.zkAccounts).toEqual([]);
  });

  it("normalizes malformed persisted payloads without throwing", () => {
    expect(migrateAccountState(null, 0)).toEqual({
      optInLeaderboard: false,
      hasShownOptInDialog: false,
    });
    expect(migrateAccountState("bad-payload", 0.6)).toEqual({});
    expect(() =>
      migrateAccountState(
        {
          trade: {
            trades: [null, { uuid: "t1", fundingHistory: null }],
          },
        },
        0
      )
    ).not.toThrow();
  });

  it("rehydrates malformed persisted payloads to clean defaults", async () => {
    const store = await rehydrateAccountState(null, 0);

    expect(store.getState().trade.trades).toEqual([]);
    expect(store.getState().lend.lends).toEqual([]);

    const persisted = readPersistedAccountState();
    expect(persisted.version).toBe(ACCOUNT_STATE_VERSION);
    expect(persisted.state.trade.trades).toEqual([]);
    expect(persisted.state.lend.lends).toEqual([]);
  });
});
