"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import * as klinecharts from "klinecharts";
import type { Chart, Period, AxisCreateRangeParams } from "klinecharts";
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
  [CandleInterval.ONE_MINUTE]: { unit: "minute", amount: 310 },
  [CandleInterval.FIVE_MINUTE]: { unit: "hour", amount: 26 },
  [CandleInterval.FIFTEEN_MINUTE]: { unit: "day", amount: 4 },
  [CandleInterval.ONE_HOUR]: { unit: "day", amount: 13 },
  [CandleInterval.FOUR_HOUR]: { unit: "day", amount: 51 },
  [CandleInterval.EIGHT_HOUR]: { unit: "day", amount: 101 },
  [CandleInterval.TWELVE_HOUR]: { unit: "day", amount: 151 },
  [CandleInterval.ONE_DAY]: { unit: "day", amount: 301 },
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

    const isMobile = window.innerWidth < 768;
    const chart = init(containerRef.current, {
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      styles: getThemeStyles(theme, isMobile),
      formatter: {
        formatDate: ({
          timestamp,
          type,
        }: {
          timestamp: number;
          type: string;
        }) => {
          const d = dayjs(timestamp);
          return d.format("YYYY-MM-DD HH:mm");
        },
      },
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
            if (type === "init") {
              bars = bars.slice(-300);
            }
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
          `${process.env.NEXT_PUBLIC_BINANCE_WS_URL}/btcusdt@kline_${bi}`
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

    // Render Y-axis labels inside the chart area so candles use the full width.
    // On mobile, also disable Y-axis scroll/zoom and clamp range to ±10% of
    // visible data to prevent swipe gestures pulling the axis to volume values.
    chart.setPaneOptions({
      id: "candle_pane",
      axis: {
        inside: true,
        ...(isMobile && {
          scrollZoomEnabled: false,
          createRange: ({ chart: c, defaultRange }: AxisCreateRangeParams) => {
            const dataList = c.getDataList();
            const visible = c.getVisibleRange();
            if (dataList.length === 0) return defaultRange;

            const start = Math.max(0, visible.from);
            const end = Math.min(dataList.length - 1, visible.to);

            let minLow = Infinity;
            let maxHigh = -Infinity;
            for (let i = start; i <= end; i++) {
              const d = dataList[i];
              if (d.low < minLow) minLow = d.low;
              if (d.high > maxHigh) maxHigh = d.high;
            }
            if (minLow === Infinity) return defaultRange;

            const padding = (maxHigh - minLow) * 0.1;
            const clampedFrom = minLow - padding;
            const clampedTo = maxHigh + padding;

            const from = Math.max(defaultRange.from, clampedFrom);
            const to = Math.min(defaultRange.to, clampedTo);
            const range = to - from;

            return {
              from,
              to,
              range,
              realFrom: from,
              realTo: to,
              realRange: range,
              displayFrom: from,
              displayTo: to,
              displayRange: range,
            } as any;
          },
        }),
      },
    });

    // Volume sub-pane — inside axis + disable Y-axis drag on mobile
    chart.createIndicator("VOL", false, {
      height: 80,
      axis: {
        inside: true,
        ...(isMobile && { scrollZoomEnabled: false }),
      },
    });
    chart.overrideIndicator({
      name: "VOL",
      calcParams: [],
    });

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
    const isMobile = window.innerWidth < 768;
    chartRef.current.setStyles(getThemeStyles(theme, isMobile));
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
    <div className="flex h-full w-full touch-none flex-col overflow-hidden">
      <div className="flex h-[40px] w-full shrink-0 border-b bg-background/40">
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
        className="relative min-h-0 flex-1 touch-none"
        style={{
          width: width > 0 ? width - 20 : "100%",
        }}
      />
    </div>
  );
};

export default KLineChart;
