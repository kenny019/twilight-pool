import { create } from "zustand";
import { AccountSlices } from "./utils";
import { immer } from "zustand/middleware/immer";
import { persist, createJSONStorage } from "zustand/middleware";
import { createZkAccountSlice } from "./slices/accounts";

export const useAccountStore = create(
  persist(
    immer<AccountSlices>((...actions) => ({
      zk: createZkAccountSlice(...actions),
    })),
    {
      name: "twilight-",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
    }
  )
);
