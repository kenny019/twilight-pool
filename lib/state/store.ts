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
import { generateSignMessage } from "../twilight/chain";

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
        skipHydration: true,
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
        twilightAddress: "",
        privateKey: "",
        setPrivateKey: (privateKey) => {
          const [set] = actions;
          set((state) => {
            state.privateKey = privateKey;
          });
        },
      })),
      {
        name: "twilight-session-",
        storage: createJSONStorage(() => sessionStorage),
        skipHydration: true,
        // note: merge only triggers when there is saved data
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
            },
            persistedState as AccountSlices
          );
          return mergedData;
        },
      }
    )
  );
};
