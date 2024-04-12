"use client";
import React, { useCallback, useRef, useState } from "react";
import Chart from "./chart.client";
import Series from "./series.client";
import { ISeriesApi, UTCTimestamp } from "lightweight-charts";
import useWebSocket from "@/lib/hooks/useWebsocket";
import { CandleData, getCandleData } from "@/lib/api/rest";
import { usePriceFeed } from "@/lib/providers/feed";
import { CandleInterval } from "@/lib/types";
import dayjs, { ManipulateType } from "dayjs";
import utc from "dayjs/plugin/utc";
import cn from "@/lib/cn";
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

const TIME_INTERVALS: {
  name: string;
  id: CandleInterval;
  offset: { unit: ManipulateType; amount: number };
}[] = [
  {
    id: CandleInterval.ONE_MINUTE,
    name: "1m",
    offset: {
      unit: "minute",
      amount: 120,
    },
  },
  {
    id: CandleInterval.FIFTEEN_MINUTE,
    name: "15m",
    offset: {
      unit: "minute",
      amount: 120,
    },
  },
  {
    id: CandleInterval.FOUR_HOUR,
    name: "4h",
    offset: {
      unit: "hour",
      amount: 20,
    },
  },
  {
    id: CandleInterval.ONE_DAY,
    name: "24h",
    offset: {
      unit: "day",
      amount: 30,
    },
  },
];

const ChartWrapper = ({ candleData }: Props) => {
  const { addPrice } = usePriceFeed();
  const [container, setContainer] = useState<ContainerRef>(null);
  const handleRef = useCallback((ref: ContainerRef) => setContainer(ref), []);

  const [timeInterval, setTimeInterval] = useState<CandleInterval>(
    CandleInterval.ONE_MINUTE
  );

  const seriesRef = useRef<ISeriesApi<"Candlestick">>(null);

  const { reconnect } = useWebSocket({
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
          interval: timeInterval,
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

      addPrice(close);

      seriesRef.current.update({
        close: close,
        open: open,
        high: high,
        low: low,
        time: currentMinuteInMs as UTCTimestamp,
      });
    } catch (err) {
      console.error(err);
    }
  }

  function onClose(ws: WebSocket) {
    console.log("candle feed closed");
  }

  return (
    <div>
      <div className="flex h-[40px] w-full border-b bg-background/40">
        {TIME_INTERVALS.map((item) => (
          <button
            className={cn(
              "border-r px-4 text-sm text-primary/80 hover:text-theme",
              timeInterval === item.id && "text-theme"
            )}
            key={item.name}
            onClick={async (e) => {
              e.preventDefault();

              if (timeInterval === item.id) return;

              setTimeInterval(item.id);
              try {
                const timeOffset = dayjs().subtract(
                  item.offset.amount,
                  item.offset.unit
                );

                const candleDataResponse = await getCandleData({
                  since: timeOffset.toISOString(),
                  interval: item.id,
                  limit: 120,
                });

                const fetchedCandleData = candleDataResponse.success
                  ? candleDataResponse.data.result
                  : [];

                fetchedCandleData.sort(
                  (left, right) =>
                    Date.parse(left.end) / 1000 - Date.parse(right.end) / 1000
                );

                const chartData = fetchedCandleData.map((candle) => {
                  const time = Math.floor(
                    Date.parse(candle.start) / 1000
                  ) as UTCTimestamp;
                  return {
                    close: parseFloat(candle.close),
                    open: parseFloat(candle.open),
                    high: parseFloat(candle.high),
                    low: parseFloat(candle.low),
                    time,
                  };
                });

                if (seriesRef.current) {
                  seriesRef.current.setData(chartData);
                }

                reconnect();
              } catch (err) {
                console.log("cleanup err", err);
              }
            }}
          >
            {item.name}
          </button>
        ))}
      </div>
      <div ref={handleRef}>
        {container && (
          <Chart container={container}>
            <Series data={candleData} ref={seriesRef} />
          </Chart>
        )}
      </div>
    </div>
  );
};

export default ChartWrapper;
