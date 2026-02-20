"use client";
import { createContext, useCallback, useContext, useMemo, useRef } from "react";
import { useSyncTrades } from '../hooks/useSyncTrades';

type PriceFeedProviderProps = {
  children: React.ReactNode;
};

type PriceUpdateCallback = () => void;

type UsePriceFeedProps = {
  feed: number[];
  addPrice: (price: number) => void;
  getCurrentPrice: () => number;
  subscribe: (callback: PriceUpdateCallback) => () => void;
  lastPrice: number;
};

const defaultContext: UsePriceFeedProps = {
  feed: [],
  addPrice: () => { },
  getCurrentPrice: () => 0,
  subscribe: () => () => { },
  lastPrice: 0,
};

const feedContext = createContext<UsePriceFeedProps | undefined>(undefined);

export const usePriceFeed = () => useContext(feedContext) ?? defaultContext;

export const PriceFeedProvider: React.FC<PriceFeedProviderProps> = (props) => {
  return <PriceFeed {...props} />;
};

const PriceFeed: React.FC<PriceFeedProviderProps> = ({ children }) => {
  const feedRef = useRef<number[]>([]);
  const lastPriceRef = useRef(0);
  const subscribersRef = useRef<Set<PriceUpdateCallback>>(new Set());

  const addPrice = useCallback<(price: number) => void>(
    (price) => {
      // Save the current last price as the previous price
      const currentLastPrice = feedRef.current.length > 0
        ? feedRef.current[feedRef.current.length - 1]
        : 0;

      const newFeed = [...feedRef.current, price];

      // Keep only the last 2 prices
      if (newFeed.length > 2) {
        newFeed.shift();
      }

      feedRef.current = newFeed;

      // Update lastPrice to the previous price for delta calculation
      lastPriceRef.current = currentLastPrice;

      // Notify all subscribers
      subscribersRef.current.forEach(callback => callback());
    },
    []
  );

  const getCurrentPrice = useCallback(() => {
    return feedRef.current.length > 1 ? feedRef.current[feedRef.current.length - 1] : 0;
  }, []);

  const subscribe = useCallback((callback: PriceUpdateCallback) => {
    subscribersRef.current.add(callback);

    // Return unsubscribe function
    return () => {
      subscribersRef.current.delete(callback);
    };
  }, []);

  const value = useMemo(() => {
    return {
      feed: feedRef.current,
      addPrice,
      getCurrentPrice,
      subscribe,
      get lastPrice() { return lastPriceRef.current; },
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addPrice, getCurrentPrice, subscribe]);

  useSyncTrades()
  // useSyncBalance()

  return <feedContext.Provider value={value}>{children}</feedContext.Provider>;
};
