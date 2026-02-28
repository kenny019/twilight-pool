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
        version: 0.5,
        migrate: (persistedState, version) => {
          if (version === 0) {
            const newState = persistedState as AccountSlices;
            if (newState.zk) {
              newState.zk.blockHeight = 0;
            }

            return newState;
          }
          if (version === 0.2) {
            const newState = persistedState as AccountSlices;
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
          if (version === 0.3) {
            const newState = persistedState as AccountSlices;
            newState.optInLeaderboard = false;
            newState.hasShownOptInDialog = false;
            return newState;
          }
          if (version === 0.4) {
            const newState = persistedState as AccountSlices;
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
            return newState;
          }
          return persistedState as AccountSlices;
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
