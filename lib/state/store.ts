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
        version: 0.6,
        migrate: (persistedState, version) => {
          const newState = persistedState as AccountSlices;

          if (version <= 0) {
            if (newState.zk) {
              newState.zk.blockHeight = 0;
            }
          }
          if (version <= 0.2) {
            if (newState.trade && Array.isArray(newState.trade.trades)) {
              newState.trade.trades = newState.trade.trades.map((trade) => ({
                ...trade,
                entryPrice: 0,
              }));
            }
          }
          if (version <= 0.3) {
            newState.optInLeaderboard = false;
            newState.hasShownOptInDialog = false;
          }
          if (version <= 0.4) {
            if (newState.trade?.trades) {
              newState.trade.trades = newState.trade.trades.map((t) => ({
                ...t,
                fundingHistory: t.fundingHistory ?? undefined,
              }));
            }
            if (newState.trade_history?.trades) {
              newState.trade_history.trades = newState.trade_history.trades.map((t) => ({
                ...t,
                fundingHistory: t.fundingHistory ?? undefined,
              }));
            }
          }
          if (version <= 0.5) {
            if (newState.trade?.trades) {
              newState.trade.trades = newState.trade.trades.map((t) => ({
                ...t,
                takeProfit: t.takeProfit ?? undefined,
                stopLoss: t.stopLoss ?? undefined,
                settleLimit: t.settleLimit
                  ? { ...t.settleLimit, timestamp: t.settleLimit.timestamp ?? undefined }
                  : t.settleLimit,
              }));
            }
            if (newState.trade_history?.trades) {
              newState.trade_history.trades = newState.trade_history.trades.map((t) => ({
                ...t,
                takeProfit: t.takeProfit ?? undefined,
                stopLoss: t.stopLoss ?? undefined,
              }));
            }
          }

          return newState;
        },
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
