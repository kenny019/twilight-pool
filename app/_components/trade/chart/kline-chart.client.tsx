"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import * as klinecharts from "klinecharts";
import type { Chart, Period } from "klinecharts";
import { useGrid } from "@/lib/providers/grid";
import { useTheme } from "next-themes";
import { usePriceFeed } from "@/lib/providers/feed";
import { getCandleData } from "@/lib/api/rest";
import { CandleInterval } from "@/lib/types";
import {
  transformCandleData,
  transformBinanceKline,
  getThemeStyles,
  periodToCandleInterval,
  CANDLE_INTERVAL_TO_PERIOD,
} from "@/lib/chart/transforms";
import cn from "@/lib/cn";
import dayjs, { type ManipulateType } from "dayjs";

// klinecharts ships ESM named exports but Next.js 13 may resolve to CJS default
const { init, dispose } = (klinecharts as any) ?? klinecharts;

const TIME_INTERVALS: {
  name: string;
  id: CandleInterval;
}[] = [
  { id: CandleInterval.ONE_MINUTE, name: "1m" },
  { id: CandleInterval.FIFTEEN_MINUTE, name: "15m" },
  { id: CandleInterval.ONE_HOUR, name: "1h" },
  { id: CandleInterval.FOUR_HOUR, name: "4h" },
  { id: CandleInterval.ONE_DAY, name: "24h" },
];

const INTERVAL_OFFSETS: Record<
  string,
  { unit: ManipulateType; amount: number }
> = {
  [CandleInterval.ONE_MINUTE]: { unit: "minute", amount: 720 },
  [CandleInterval.FIVE_MINUTE]: { unit: "minute", amount: 720 },
  [CandleInterval.FIFTEEN_MINUTE]: { unit: "day", amount: 14 },
  [CandleInterval.ONE_HOUR]: { unit: "day", amount: 30 },
  [CandleInterval.FOUR_HOUR]: { unit: "day", amount: 90 },
  [CandleInterval.EIGHT_HOUR]: { unit: "day", amount: 7 },
  [CandleInterval.TWELVE_HOUR]: { unit: "day", amount: 7 },
  [CandleInterval.ONE_DAY]: { unit: "day", amount: 365 },
  [CandleInterval.ONE_DAY_CHANGE]: { unit: "day", amount: 1 },
};

const BINANCE_INTERVAL_MAP: Record<string, string> = {
  [CandleInterval.ONE_MINUTE]: "1m",
  [CandleInterval.FIFTEEN_MINUTE]: "15m",
  [CandleInterval.ONE_HOUR]: "1h",
  [CandleInterval.FOUR_HOUR]: "4h",
  [CandleInterval.ONE_DAY]: "1d",
};

const KLineChart = () => {
  const chartRef = useRef<Chart | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const { width, height } = useGrid();
  const { theme } = useTheme();
  const { addPrice } = usePriceFeed();
  const addPriceRef = useRef(addPrice);
  const [timeInterval, setTimeInterval] = useState<CandleInterval>(
    CandleInterval.FIFTEEN_MINUTE
  );

  // Keep addPrice ref in sync to avoid stale closure in subscribeBar
  useEffect(() => {
    addPriceRef.current = addPrice;
  }, [addPrice]);

  // Init chart
  useEffect(() => {
    if (!containerRef.current) return;

    const chart = init(containerRef.current, {
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      styles: getThemeStyles(theme),
    });

    if (!chart) return;

    chartRef.current = chart;

    // Register data loader before setSymbol/setPeriod
    chart.setDataLoader({
      getBars: async ({
        type,
        timestamp,
        period,
        callback,
      }: {
        type: string;
        timestamp: number | null;
        period: Period;
        callback: (data: any[], more?: any) => void;
      }) => {
        const interval = periodToCandleInterval(period);
        const offset = INTERVAL_OFFSETS[interval];
        if (!offset) {
          callback([], false);
          return;
        }

        if (type === "init" || type === "forward") {
          const since =
            type === "init"
              ? dayjs().subtract(offset.amount, offset.unit).toISOString()
              : dayjs(timestamp!)
                  .subtract(offset.amount, offset.unit)
                  .toISOString();
          try {
            const res = await getCandleData({ since, interval, limit: 10000 });
            if (!res.success) {
              callback([], false);
              return;
            }
            let bars = res.data.result.map(transformCandleData);
            bars.sort((a, b) => a.timestamp - b.timestamp);
            if (type === "forward") {
              bars = bars.filter((b) => b.timestamp < timestamp!);
            }
            callback(bars, { forward: bars.length > 0 });
          } catch {
            callback([], false);
          }
        } else {
          callback([], false);
        }
      },
      subscribeBar: ({
        period,
        callback,
      }: {
        period: Period;
        callback: (data: any) => void;
      }) => {
        const interval = periodToCandleInterval(period);
        const bi = BINANCE_INTERVAL_MAP[interval];
        if (!bi) return;
        const ws = new WebSocket(
          `wss://stream.binance.com/ws/btcusdt@kline_${bi}`
        );
        ws.onmessage = (event) => {
          try {
            const parsed = JSON.parse(event.data);
            const kd = transformBinanceKline(parsed.k);
            callback(kd);
            addPriceRef.current(kd.close);
          } catch (err) {
            console.error(err);
          }
        };
        wsRef.current = ws;
      },
      unsubscribeBar: () => {
        wsRef.current?.close();
        wsRef.current = null;
      },
    });

    chart.setSymbol({
      ticker: "BTCUSD",
      pricePrecision: 2,
      volumePrecision: 4,
    });
    chart.setPeriod(CANDLE_INTERVAL_TO_PERIOD[timeInterval]);

    // MA overlays
    chart.createIndicator("MA", true, { id: "candle_pane" });
    chart.overrideIndicator({
      name: "MA",
      calcParams: [7, 25, 99],
      paneId: "candle_pane",
    });

    // Volume sub-pane
    chart.createIndicator("VOL", false, { height: 80 });

    const container = containerRef.current;
    return () => {
      wsRef.current?.close();
      if (container) dispose(container);
      chartRef.current = null;
    };
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Resize chart when container dimensions change
  useEffect(() => {
    chartRef.current?.resize();
  }, [width, height]);

  // Theme changes
  useEffect(() => {
    if (!chartRef.current) return;
    chartRef.current.setStyles(getThemeStyles(theme));
  }, [theme]);

  const handleIntervalChange = useCallback(
    (item: (typeof TIME_INTERVALS)[number]) => {
      if (timeInterval === item.id) return;
      setTimeInterval(item.id);
      chartRef.current?.setPeriod(CANDLE_INTERVAL_TO_PERIOD[item.id]);
    },
    [timeInterval]
  );

  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex h-[40px] w-full border-b bg-background/40">
        {TIME_INTERVALS.map((item) => (
          <button
            className={cn(
              "border-r px-4 text-sm text-primary/80 hover:text-theme",
              timeInterval === item.id && "text-theme"
            )}
            key={item.name}
            onClick={() => handleIntervalChange(item)}
          >
            {item.name}
          </button>
        ))}
      </div>
      <div
        ref={containerRef}
        className="relative"
        style={{
          width: width > 0 ? width - 20 : "100%",
          height: height > 0 ? height - 120 : "100%",
        }}
      />
    </div>
  );
};

export default KLineChart;
