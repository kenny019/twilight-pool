import { AccountSlices, SessionSlices, StateImmerCreator } from "../utils";

export interface PriceSlice {
  btcPrice: number;
  setPrice: (price: number) => void;
}

export const initialPriceSliceState = {
  btcPrice: 0,
};

export const createPriceSlice: StateImmerCreator<SessionSlices, PriceSlice> = (
  set
) => ({
  ...initialPriceSliceState,
  setPrice: (price) => {
    set((state) => {
      state.price.btcPrice = price;
    });
  },
});
