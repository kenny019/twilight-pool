"use client";
import React, { useCallback, useRef, useState } from "react";
import Chart from "./chart.client";
import Series from "./series.client";
import { ISeriesApi, UTCTimestamp } from "lightweight-charts";
import useWebSocket from "@/lib/hooks/useWebsocket";
import { CandleData } from "@/lib/api/rest";
import { usePriceFeed } from "@/lib/providers/feed";
import { CandleInterval } from "@/lib/types";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
dayjs.extend(utc);

type ContainerRef = HTMLElement | null;

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

type Props = {
  candleData: CandleData[];
};

type minCandleData = {
  open: number;
  high: number;
  low: number;
  close: number;
};

const ChartWrapper = ({ candleData }: Props) => {
  const { addPrice } = usePriceFeed();
  const [container, setContainer] = useState<ContainerRef>(null);
  const handleRef = useCallback((ref: ContainerRef) => setContainer(ref), []);

  const lastUpdatedTime = useRef<number>(0);

  const latestCandleData = useRef<minCandleData>({
    close: 0,
    high: 0,
    low: 0,
    open: 0,
  });

  const firstCandlePrice = useRef<number>(0);

  const seriesRef = useRef<ISeriesApi<"Candlestick">>(null);

  useWebSocket({
    url: process.env.NEXT_PUBLIC_TWILIGHT_PRICE_WS as string,
    onOpen: onOpen,
    onMessage: onMessage,
    onClose: onClose,
  });

  function onOpen(ws: WebSocket) {
    ws.send(
      JSON.stringify({
        jsonrpc: "2.0",
        method: "subscribe_candle_data",
        id: 123,
        params: {
          interval: CandleInterval.ONE_MINUTE,
        },
      })
    );
  }

  function onMessage(message: any) {
    try {
      const parsedMessage = JSON.parse(message.data);

      if (!parsedMessage.params || !parsedMessage.params.result) {
        return;
      }

      if (!seriesRef.current || seriesRef.current === null) {
        return;
      }

      const candleStickDataArr = parsedMessage.params
        .result as CandlestickData[];

      const candleStickData = candleStickDataArr[0];

      const currentMinuteInMs = dayjs
        .utc(candleStickData.end)
        .startOf("m")
        .unix();

      const { close, open, high, low } = {
        close: parseFloat(candleStickData.close),
        open: parseFloat(candleStickData.open),
        high: parseFloat(candleStickData.high),
        low: parseFloat(candleStickData.low),
      };

      if (currentMinuteInMs > lastUpdatedTime.current) {
        if (lastUpdatedTime.current > 0) {
          // note: we close the previous candle
          seriesRef.current.update({
            open: firstCandlePrice.current,
            close: close,
            high: Math.max(latestCandleData.current.high || high, high),
            low: Math.min(latestCandleData.current.low || low, low),
            time: lastUpdatedTime.current as UTCTimestamp,
          });
        }

        // note: we open the new candle
        seriesRef.current.update({
          open: open,
          close: close,
          high: high,
          low: low,
          time: currentMinuteInMs as UTCTimestamp,
        });

        // note: also store latest candle data
        latestCandleData.current = {
          open: open,
          close: close,
          high: high,
          low: low,
        };

        // note: new timespan so update first and last
        lastUpdatedTime.current = currentMinuteInMs;

        // note: update open price
        firstCandlePrice.current = close;

        addPrice(close);
        return;
      }

      addPrice(close);

      seriesRef.current.update({
        close: close,
        open: firstCandlePrice.current,
        high: Math.max(latestCandleData.current.high || high, high),
        low: Math.min(latestCandleData.current.low || low, low),
        time: currentMinuteInMs as UTCTimestamp,
      });

      latestCandleData.current = {
        close: close,
        open: firstCandlePrice.current,
        high: Math.max(latestCandleData.current.high || high, high),
        low: Math.min(latestCandleData.current.low || low, low),
      };
    } catch (err) {
      console.error(err);
    }
  }

  function onClose(ws: WebSocket) {
    console.log("candle feed closed");
    ws.send(
      JSON.stringify({
        jsonrpc: "2.0",
        method: "unsubscribe_candle_data",
        id: 123,
        params: {
          interval: CandleInterval.ONE_MINUTE,
        },
      })
    );
  }

  return (
    <div ref={handleRef}>
      {container && (
        <Chart container={container}>
          <Series data={candleData} ref={seriesRef} />
        </Chart>
      )}
    </div>
  );
};

export default ChartWrapper;
