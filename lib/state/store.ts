import { create, createStore } from "zustand";
import { AccountSlices } from "./utils";
import { immer } from "zustand/middleware/immer";
import { persist, createJSONStorage } from "zustand/middleware";
import { createZkAccountSlice } from "./slices/accounts";
import { createLendSlice } from "./slices/lend";
import { createTradeSlice } from "./slices/trade";
import deepMerge from "deepmerge";

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
          const mergedData = deepMerge(
            {
              zk: {
                ...currentState.zk,
                zkAccounts: [],
                selectedZkAccount: -1,
                twilightAddress: "",
              },
              lend: {
                ...currentState.lend,
                lends: [],
              },
              trade: {
                ...currentState.trade,
                trades: [],
              },
            },
            persistedState as AccountSlices
          );

          return mergedData;
        },
      }
    )
  );
};
