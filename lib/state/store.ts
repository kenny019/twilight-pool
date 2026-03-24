import { createStore } from "zustand";
import { AccountSlices, SessionSlices } from "./utils";
import { immer } from "zustand/middleware/immer";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  createZkAccountSlice,
  initialZkAccountSliceState,
} from "./local/accounts";
import { createLendSlice, initialLendSliceState } from "./local/lend";
import { createTradeSlice, initialTradeSliceState } from "./local/trade";
import deepMerge from "deepmerge";
import {
  createSessionTradeSlice,
  initialSessionTradeData,
} from "./session/trade";
import { createHistorySlice, initialHistorySliceState } from "./local/history";
import { createPriceSlice } from "./session/price";
import {
  createTradeHistorySlice,
  initialTradeHistorySliceState,
} from "./local/trade-history";
import {
  createWithdrawSlice,
  initialWithdrawSliceState,
} from "./local/withdraw";

type PersistedAccountState = Partial<AccountSlices> & Record<string, unknown>;

export const ACCOUNT_STATE_VERSION = 0.7;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function clonePersistedAccountState(
  persistedState: unknown
): PersistedAccountState {
  if (!isRecord(persistedState)) return {};
  return deepMerge({}, persistedState) as PersistedAccountState;
}

function mapPersistedTrades(
  state: PersistedAccountState,
  sliceKey: "trade" | "trade_history",
  mapper: (trade: Record<string, unknown>) => Record<string, unknown>
) {
  const sliceValue = state[sliceKey];
  if (!isRecord(sliceValue)) return;

  const slice = sliceValue as { trades?: unknown[] };
  if (!Array.isArray(slice.trades)) return;

  slice.trades = slice.trades.map((trade) =>
    isRecord(trade) ? mapper(trade) : trade
  );
}

function migrateSltpField(field: unknown) {
  if (!isRecord(field)) return field;

  return {
    price: field.price ?? field.sl_price ?? field.tp_price ?? "0",
    position_type: field.position_type,
    uuid: field.uuid,
    created_time: field.created_time ?? field.timestamp,
  };
}

/** Versions are intentionally decimal for compatibility with existing storage. */
export function migrateAccountState(
  persistedState: unknown,
  version: number
): AccountSlices {
  // Fail closed when this client sees storage from a newer app version.
  if (version > ACCOUNT_STATE_VERSION) {
    return {} as AccountSlices;
  }

  const newState = clonePersistedAccountState(persistedState);

  if (version < 0.2) {
    if (newState.zk) {
      (
        newState.zk as typeof initialZkAccountSliceState &
          Record<string, unknown>
      ).blockHeight = 0;
    }
  }

  if (version < 0.3) {
    mapPersistedTrades(newState, "trade", (trade) => ({
      ...trade,
      entryPrice: 0,
    }));
  }

  if (version < 0.4) {
    newState.optInLeaderboard = false;
    newState.hasShownOptInDialog = false;
  }

  if (version < 0.5) {
    mapPersistedTrades(newState, "trade", (trade) => ({
      ...trade,
      fundingHistory: trade.fundingHistory ?? undefined,
    }));
    mapPersistedTrades(newState, "trade_history", (trade) => ({
      ...trade,
      fundingHistory: trade.fundingHistory ?? undefined,
    }));
  }

  if (version < 0.6) {
    mapPersistedTrades(newState, "trade", (trade) => ({
      ...trade,
      takeProfit: trade.takeProfit ?? undefined,
      stopLoss: trade.stopLoss ?? undefined,
      settleLimit: isRecord(trade.settleLimit)
        ? {
            ...trade.settleLimit,
            timestamp: trade.settleLimit.timestamp ?? undefined,
          }
        : trade.settleLimit,
    }));
    mapPersistedTrades(newState, "trade_history", (trade) => ({
      ...trade,
      takeProfit: trade.takeProfit ?? undefined,
      stopLoss: trade.stopLoss ?? undefined,
    }));
  }

  if (version < ACCOUNT_STATE_VERSION) {
    mapPersistedTrades(newState, "trade", (trade) => ({
      ...trade,
      takeProfit: migrateSltpField(trade.takeProfit),
      stopLoss: migrateSltpField(trade.stopLoss),
    }));
    mapPersistedTrades(newState, "trade_history", (trade) => ({
      ...trade,
      takeProfit: migrateSltpField(trade.takeProfit),
      stopLoss: migrateSltpField(trade.stopLoss),
    }));
  }

  return newState as AccountSlices;
}

export const createTwilightStore = (storageKey = "twilight-") => {
  return createStore<
    AccountSlices,
    [["zustand/persist", AccountSlices], ["zustand/immer", never]]
  >(
    persist(
      immer<AccountSlices>((...actions) => ({
        zk: createZkAccountSlice(...actions),
        lend: createLendSlice(...actions),
        trade: createTradeSlice(...actions),
        history: createHistorySlice(...actions),
        trade_history: createTradeHistorySlice(...actions),
        withdraw: createWithdrawSlice(...actions),
        optInLeaderboard: false,
        hasShownOptInDialog: false,
        setOptInLeaderboard: (val: boolean) => {
          const [set] = actions;
          set((state) => {
            state.optInLeaderboard = val;
          });
        },
        setHasShownOptInDialog: (val: boolean) => {
          const [set] = actions;
          set((state) => {
            state.hasShownOptInDialog = val;
          });
        },
      })),
      {
        name: storageKey,
        storage: createJSONStorage<AccountSlices>(() => localStorage),
        skipHydration: true,
        version: ACCOUNT_STATE_VERSION,
        migrate: migrateAccountState,
        merge: (persistedState, currentState) => {
          const cleanCurrentState = {
            zk: {
              ...currentState.zk,
              ...initialZkAccountSliceState,
            },
            trade: {
              ...currentState.trade,
              ...initialTradeSliceState,
            },
            lend: {
              ...currentState.lend,
              ...initialLendSliceState,
            },
            history: {
              ...currentState.history,
              ...initialHistorySliceState,
            },
            trade_history: {
              ...currentState.trade_history,
              ...initialTradeHistorySliceState,
            },
            withdraw: {
              ...currentState.withdraw,
              ...initialWithdrawSliceState,
            },
            optInLeaderboard: currentState.optInLeaderboard,
            hasShownOptInDialog: currentState.hasShownOptInDialog,
            setOptInLeaderboard: currentState.setOptInLeaderboard,
            setHasShownOptInDialog: currentState.setHasShownOptInDialog,
          };

          const mergedData = deepMerge(
            cleanCurrentState,
            persistedState as AccountSlices
          );

          return mergedData;
        },
      }
    )
  );
};

export const createSessionStore = () => {
  return createStore<
    SessionSlices,
    [["zustand/persist", SessionSlices], ["zustand/immer", never]]
  >(
    persist(
      immer<SessionSlices>((...actions) => ({
        trade: createSessionTradeSlice(...actions),
        twilightAddress: "",
        privateKey: "",
        setPrivateKey: (privateKey) => {
          const [set] = actions;
          set((state) => {
            state.privateKey = privateKey;
          });
        },
        price: createPriceSlice(...actions),
      })),
      {
        name: "twilight-session-",
        storage: createJSONStorage<SessionSlices>(() => sessionStorage),
        skipHydration: true,
        version: 0.1,
        merge: (persistedState, currentState) => {
          const mergedData = deepMerge(
            {
              trade: {
                ...currentState.trade,
                ...initialSessionTradeData,
              },
              twilightAddress: currentState.twilightAddress,
              setPrivateKey: currentState.setPrivateKey,
              privateKey: "",
              price: currentState.price,
            },
            persistedState as SessionSlices
          );
          return mergedData;
        },
        migrate: (persistedState, version) => {
          if (version === 0) {
            const newState = persistedState as SessionSlices;

            if (newState.trade && Array.isArray(newState.trade.trades)) {
              newState.trade.trades = newState.trade.trades.map((trade) => {
                return {
                  ...trade,
                  entryPrice: 0,
                };
              });
            }

            return newState;
          }

          return persistedState as SessionSlices;
        },
      }
    )
  );
};
