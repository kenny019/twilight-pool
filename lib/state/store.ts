import { createStore } from "zustand";
import { AccountSlices, SessionSlices } from "./utils";
import { immer } from "zustand/middleware/immer";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  createZkAccountSlice,
  initialZkAccountSliceState,
} from "./slices/accounts";
import { createLendSlice, initialLendSliceState } from "./slices/lend";
import { createTradeSlice, initialTradeSliceState } from "./slices/trade";
import deepMerge from "deepmerge";
import { createSessionTradeSlice } from "./session/trade";

export const createTwilightStore = () => {
  return createStore<
    AccountSlices,
    [["zustand/persist", never], ["zustand/immer", never]]
  >(
    persist(
      immer<AccountSlices>((...actions) => ({
        zk: createZkAccountSlice(...actions),
        lend: createLendSlice(...actions),
        trade: createTradeSlice(...actions),
      })),
      {
        name: "twilight-",
        storage: createJSONStorage(() => localStorage),
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
          };

          console.log("merged localstorage current data ->", cleanCurrentState);
          console.log("merged localstorage persisted data ->", persistedState);
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
    [["zustand/persist", never], ["zustand/immer", never]]
  >(
    persist(
      immer<SessionSlices>((...actions) => ({
        trade: createSessionTradeSlice(...actions),
      })),
      {
        name: "twilight-session-",
        storage: createJSONStorage(() => sessionStorage),
        skipHydration: true,
        merge: (persistedState, currentState) => {
          const mergedData = deepMerge(
            {
              trade: {
                ...currentState.trade,
                trades: [],
              },
            },
            persistedState as AccountSlices
          );

          console.log("merged session", mergedData);
          return mergedData;
        },
      }
    )
  );
};
