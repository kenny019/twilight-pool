"use client";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

type PriceFeedProviderProps = {
  children: React.ReactNode;
};

type UsePriceFeedProps = {
  feed: number[];
  currentPrice: number;
  addPrice: (price: number) => void;
};

const defaultContext: UsePriceFeedProps = {
  feed: [],
  currentPrice: 49980, // todo: fetch initial price
  addPrice: () => {},
};

const feedContext = createContext<UsePriceFeedProps | undefined>(undefined);

export const usePriceFeed = () => useContext(feedContext) ?? defaultContext;

export const PriceFeedProvider: React.FC<PriceFeedProviderProps> = (props) => {
  return <PriceFeed {...props} />;
};

const PriceFeed: React.FC<PriceFeedProviderProps> = ({ children }) => {
  const [feed, setFeed] = useState<number[]>([]);

  const addPrice = useCallback<(price: number) => void>(
    (price) => {
      if (feed.length < 1) {
        const newFeed = [price];
        setFeed(newFeed);
        return;
      }

      const newFeed = [...feed];

      newFeed.push(price);

      if (feed.length > 2) {
        newFeed.shift();
      }

      setFeed(newFeed);
    },
    [feed]
  );

  const value = useMemo(() => {
    return {
      feed: feed,
      currentPrice: feed[feed.length - 1] || 0,
      addPrice,
    };
  }, [feed]);

  return <feedContext.Provider value={value}>{children}</feedContext.Provider>;
};
