import { create } from "zustand";
import { AccountSlices } from "./utils";
import { immer } from "zustand/middleware/immer";
import { persist, createJSONStorage } from "zustand/middleware";
import { createZkAccountSlice } from "./slices/accounts";
import { createLendSlice } from "./slices/lend";

export const useTwilightStore = create(
  persist(
    immer<AccountSlices>((...actions) => ({
      zk: createZkAccountSlice(...actions),
      lend: createLendSlice(...actions),
    })),
    {
      name: "twilight-",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
    }
  )
);
