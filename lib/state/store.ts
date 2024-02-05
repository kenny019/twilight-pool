import { create } from "zustand";
import { AccountSlices } from "./utils";
import { immer } from "zustand/middleware/immer";
import { persist, createJSONStorage } from "zustand/middleware";
import { createZkAccountSlice } from "./slices/accounts";

export const useAccountStore = create<AccountSlices>()(
  persist(
    immer((set, get, store) => ({
      zk: createZkAccountSlice(set, get, store),
    })),
    {
      name: "twilight-",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
    }
  )
);
