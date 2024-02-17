import React, { forwardRef, useLayoutEffect, useRef } from "react";
import { useChart } from "./chart-old.client";
import { ISeriesApi, UTCTimestamp } from "lightweight-charts";
import useWebSocket from "@/lib/hooks/useWebsocket";

type SeriesContext = {
  _api?: ISeriesApi<"Candlestick">;
  api: () => ISeriesApi<"Candlestick"> | void;
  free: () => void;
  lastUpdatedTime: number;
};

type CandlestickData = {
  btc_volume: string;
  close: string;
  end: string;
  high: string;
  low: string;
  open: string;
  resolution: string;
  start: string;
  trades: number;
};

const SeriesOld = forwardRef(({}, ref) => {
  const chartContext = useChart();

  const seriesRef = useRef<SeriesContext>({
    lastUpdatedTime: 0,
    _api: undefined,
    api() {
      if (!this._api) {
        this._api = chartContext._api?.addCandlestickSeries({
          upColor: "#5FDB66",
          downColor: "#F84952",
          wickUpColor: "#5FDB66",
          wickDownColor: "#F84952",
        });
      }
      return this._api;
    },
    free() {
      if (this._api) {
        chartContext.free();
      }
    },
  });

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
        method: "subscribe_candle_data",
        id: 123,
        params: {
          interval: "ONE_MINUTE",
        },
      })
    );
  }

  function onMessage(message: any) {
    try {
      const parsedMessage = JSON.parse(message.data);

      // console.log("candledata", parsedMessage);
      if (!parsedMessage.params || !parsedMessage.params.result) return;

      const data = parsedMessage.params.result as CandlestickData[];

      data.sort(
        (left, right) =>
          Date.parse(left.end) / 1000 - Date.parse(right.end) / 1000
      );

      data.forEach((priceData: CandlestickData, index) => {
        const time = Math.floor(
          Date.parse(priceData.start) / 1000
        ) as UTCTimestamp;

        if (time < seriesRef.current.lastUpdatedTime) return;

        if (index === data.length - 1) {
          seriesRef.current.lastUpdatedTime = time;
        }

        // const time = new Date(priceData.start);
        seriesRef.current._api?.update({
          close: parseInt(priceData.close),
          open: parseInt(priceData.open),
          high: parseInt(priceData.high),
          low: parseInt(priceData.low),
          time,
          // time: 1642514276,
        });
      });
    } catch (err) {
      console.error(err);
    }
  }

  function onClose() {
    console.log("candle feed closed");
  }

  useLayoutEffect(() => {
    const currentRef = seriesRef.current;
    currentRef.api();

    return () => currentRef.free();
  }, []);

  return <></>;
});

SeriesOld.displayName = "Series";

export default SeriesOld;
