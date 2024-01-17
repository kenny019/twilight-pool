"use client";
import { createContext, useContext, useMemo, useState } from "react";
import { z } from "zod";
import useWebSocket from "../hooks/useWebsocket";

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
  currentPrice: number;
};

const defaultContext: UsePriceFeedProps = {
  feed: [],
  currentPrice: 0,
};

const feedContext = createContext<UsePriceFeedProps | undefined>(undefined);

export const usePriceFeed = () => useContext(feedContext) ?? defaultContext;

export const PriceFeedProvider: React.FC<PriceFeedProviderProps> = (props) => {
  return <PriceFeed {...props} />;
};

const PriceFeed: React.FC<PriceFeedProviderProps> = ({ children }) => {
  const [feed, setFeed] = useState<FeedData[]>([]);

  useWebSocket({
    url: process.env.NEXT_PUBLIC_TWILIGHT_PRICE_WS as string,
    onOpen: onOpen,
    onMessage: onMessage,
    onClose: onClose,
  });

  function onOpen(ws: WebSocket) {
    console.log("ws", ws);
    ws.send(
      JSON.stringify({
        jsonrpc: "2.0",
        method: "subscribe_live_price_data",
        id: 123,
        params: null,
      })
    );
  }

  function onMessage(message: any) {
    try {
      const parsedMessage = JSON.parse(message.data);

      const feedDataRes = FeedDataSchema.safeParse(parsedMessage);

      if (!feedDataRes.success) {
        console.log("non feed data detected >> ", parsedMessage);
        return;
      }

      setFeed((oldFeed) => {
        return [oldFeed[oldFeed.length - 1], feedDataRes.data];
      });
    } catch (err) {
      console.error(err);
    }
  }

  function onClose() {
    console.log("price feed closed");
  }

  const value = useMemo(() => {
    return {
      feed: feed,
      currentPrice:
        feed.length > 0 ? feed[feed.length - 1].params.result[0] : 0,
    };
  }, [feed]);

  return <feedContext.Provider value={value}>{children}</feedContext.Provider>;
};
