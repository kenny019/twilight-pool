import { create } from "zustand";
import { AccountSlices } from "./utils";
import { immer } from "zustand/middleware/immer";
import { persist, createJSONStorage } from "zustand/middleware";
import { createZkAccountSlice } from "./slices/accounts";
import { createLendSlice } from "./slices/lend";
import { createTradeSlice } from "./slices/trade";

export const useTwilightStore = create(
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
    }
  )
);
