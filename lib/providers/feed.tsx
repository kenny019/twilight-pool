"use client";
import { createContext, useCallback, useContext, useMemo, useRef } from "react";

type PriceFeedProviderProps = {
  children: React.ReactNode;
};

type UsePriceFeedProps = {
  feed: number[];
  addPrice: (price: number) => void;
};

const defaultContext: UsePriceFeedProps = {
  feed: [],
  addPrice: () => {},
};

const feedContext = createContext<UsePriceFeedProps | undefined>(undefined);

export const usePriceFeed = () => useContext(feedContext) ?? defaultContext;

export const PriceFeedProvider: React.FC<PriceFeedProviderProps> = (props) => {
  return <PriceFeed {...props} />;
};

const PriceFeed: React.FC<PriceFeedProviderProps> = ({ children }) => {
  const feed = useRef<number[]>([]);

  const addPrice = useCallback<(price: number) => void>(
    (price) => {
      feed.current.push(price);

      if (feed.current.length > 2) {
        feed.current.shift();
      }
    },
    [feed.current.length]
  );

  const value = useMemo(() => {
    return {
      feed: feed.current,
      addPrice,
    };
  }, [feed, addPrice]);

  return <feedContext.Provider value={value}>{children}</feedContext.Provider>;
};
