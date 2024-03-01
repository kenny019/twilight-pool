"use client";
import React, { useCallback, useRef, useState } from "react";
import Chart from "./chart.client";
import Series from "./series.client";
import { ISeriesApi, UTCTimestamp } from "lightweight-charts";
import useWebSocket from "@/lib/hooks/useWebsocket";
import { CandleData } from "@/lib/api/rest";
import { usePriceFeed } from "@/lib/providers/feed";

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

const ChartWrapper = ({ candleData }: Props) => {
  const { addPrice } = usePriceFeed();
  const [container, setContainer] = useState<ContainerRef>(null);
  const lastUpdatedTime = useRef(0);
  const handleRef = useCallback((ref: ContainerRef) => setContainer(ref), []);

  const seriesRef = useRef<ISeriesApi<"Candlestick">>(null);

  useWebSocket({
    url: process.env.NEXT_PUBLIC_TWILIGHT_PRICE_WS as string,
    onOpen: onOpen,
    onMessage: onMessage,
    onClose: onClose,
  });

  function onOpen(ws: WebSocket) {
    const seriesData = seriesRef.current?.data();

    if (seriesData && seriesData.length) {
      lastUpdatedTime.current = seriesData[seriesData.length - 1]
        .time as number;
    }

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
      if (!parsedMessage.params || !parsedMessage.params.result) {
        console.log("price chart invalid payload");
        return;
      }

      const data = parsedMessage.params.result as CandlestickData[];

      data.sort(
        (left, right) =>
          Date.parse(left.end) / 1000 - Date.parse(right.end) / 1000
      );

      data.forEach((priceData: CandlestickData, index) => {
        const time = Math.floor(
          Date.parse(priceData.start) / 1000
        ) as UTCTimestamp;

        if (!seriesRef.current || seriesRef.current === null) {
          return;
        }

        if (time < lastUpdatedTime.current) return;

        lastUpdatedTime.current = time;

        addPrice(parseInt(priceData.close));
        seriesRef.current.update({
          close: parseInt(priceData.close),
          open: parseInt(priceData.open),
          high: parseInt(priceData.high),
          low: parseInt(priceData.low),
          time,
        });
      });
    } catch (err) {
      console.error(err);
    }
  }

  function onClose() {
    console.log("candle feed closed");
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
