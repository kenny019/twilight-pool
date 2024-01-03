"use client";
import { createContext, useContext, useEffect, useRef } from "react";
import { z } from "zod";

type PriceFeedProviderProps = {
  children: React.ReactNode;
};

const FeedDataSchema = z.object({
  jsonrpc: z.string(),
  method: z.string(),
  params: z.object({
    subscription: z.number(),
    result: z.tuple([z.number(), z.string()]),
  }),
});

type FeedData = z.infer<typeof FeedDataSchema>;

type UsePriceFeedProps = {
  feed: FeedData[];
  unsubscribe: () => void;
};

const defaultContext: UsePriceFeedProps = {
  feed: [],
  unsubscribe: () => {},
};

const feedContext = createContext<UsePriceFeedProps | undefined>(undefined);

export const usePriceFeed = () => useContext(feedContext) ?? defaultContext;

export const PriceFeedProvider: React.FC<PriceFeedProviderProps> = (props) => {
  return <PriceFeed {...props} />;
};

const PriceFeed: React.FC<PriceFeedProviderProps> = ({ children }) => {
  const ws = useRef<WebSocket | null>(null);

  const feed = useRef<FeedData[]>([]);

  const unsubscribe = () => {
    if (!ws.current) return;
    ws.current.close();
  };

  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      // insecure websocket for now
      ws.current = new WebSocket(
        process.env.NEXT_PUBLIC_TWILIGHT_PRICE_WS as string
      );
    }

    if (ws.current === null) return;

    ws.current.onopen = () => {
      if (ws.current === null) return;

      ws.current.send(
        JSON.stringify({
          jsonrpc: "2.0",
          method: "subscribe_live_price_data",
          id: 123,
          params: null,
        })
      );
    };

    ws.current.onmessage = (message) => {
      try {
        const parsedMessage = JSON.parse(message.data);

        const feedDataRes = FeedDataSchema.safeParse(parsedMessage);

        if (!feedDataRes.success) {
          console.log("non feed data detected >> ", parsedMessage);
          return;
        }

        feed.current.push(feedDataRes.data);
      } catch (err) {
        console.error(err);
      }
    };

    ws.current.onclose = () => console.log("price feed closed");

    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, []);

  return (
    <feedContext.Provider
      value={{
        feed: feed.current,
        unsubscribe,
      }}
    >
      {children}
    </feedContext.Provider>
  );
};
