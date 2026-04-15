"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import * as klinecharts from "klinecharts";
import type {
  Chart,
  Period,
  AxisCreateRangeParams,
  KLineData,
} from "klinecharts";
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
import useWindow from "@/lib/hooks/useWindow";
import { BookOpen } from "lucide-react";

// klinecharts ships ESM named exports but Next.js 13 may resolve to CJS default
const { init, dispose } = (klinecharts as any) ?? klinecharts;

type IntervalOption = { name: string; id: CandleInterval };

const DEFAULT_TIME_INTERVAL = CandleInterval.FIFTEEN_MINUTE;

const TIME_INTERVALS: IntervalOption[] = [
  { id: CandleInterval.ONE_MINUTE, name: "1m" },
  { id: CandleInterval.FIVE_MINUTE, name: "5m" },
  { id: CandleInterval.FIFTEEN_MINUTE, name: "15m" },
  { id: CandleInterval.ONE_HOUR, name: "1h" },
  { id: CandleInterval.FOUR_HOUR, name: "4h" },
  { id: CandleInterval.EIGHT_HOUR, name: "8h" },
  { id: CandleInterval.TWELVE_HOUR, name: "12h" },
  { id: CandleInterval.ONE_DAY, name: "1d" },
];

/** Intervals always visible on mobile */
const MOBILE_VISIBLE: Set<CandleInterval> = new Set([
  CandleInterval.ONE_MINUTE,
  CandleInterval.FIFTEEN_MINUTE,
  CandleInterval.ONE_HOUR,
  CandleInterval.ONE_DAY,
]);

const MOBILE_VISIBLE_INTERVALS = TIME_INTERVALS.filter((i) =>
  MOBILE_VISIBLE.has(i.id)
);
const MOBILE_OVERFLOW_INTERVALS = TIME_INTERVALS.filter(
  (i) => !MOBILE_VISIBLE.has(i.id)
);

const COMPACT_VISIBLE: Set<CandleInterval> = new Set([
  CandleInterval.ONE_MINUTE,
  CandleInterval.FIVE_MINUTE,
  CandleInterval.FIFTEEN_MINUTE,
  CandleInterval.ONE_HOUR,
  CandleInterval.FOUR_HOUR,
  CandleInterval.ONE_DAY,
]);

const COMPACT_VISIBLE_INTERVALS = TIME_INTERVALS.filter((i) =>
  COMPACT_VISIBLE.has(i.id)
);
const COMPACT_OVERFLOW_INTERVALS = TIME_INTERVALS.filter(
  (i) => !COMPACT_VISIBLE.has(i.id)
);

const COMPACT_CHART_THRESHOLD = 996;

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
  [CandleInterval.FIVE_MINUTE]: "5m",
  [CandleInterval.FIFTEEN_MINUTE]: "15m",
  [CandleInterval.ONE_HOUR]: "1h",
  [CandleInterval.FOUR_HOUR]: "4h",
  [CandleInterval.EIGHT_HOUR]: "8h",
  [CandleInterval.TWELVE_HOUR]: "12h",
  [CandleInterval.ONE_DAY]: "1d",
};

type KLineChartProps = {
  onShowTrades?: () => void;
};

const KLineChart = ({ onShowTrades }: KLineChartProps) => {
  const chartRef = useRef<Chart | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const { width, height } = useGrid();
  const { width: windowWidth } = useWindow();
  const { theme } = useTheme();
  const { addPrice } = usePriceFeed();
  const addPriceRef = useRef(addPrice);
  const [timeInterval, setTimeInterval] = useState<CandleInterval>(
    DEFAULT_TIME_INTERVAL
  );
  const isCompactChart =
    windowWidth > 0 && windowWidth < COMPACT_CHART_THRESHOLD;
  const isPhoneChart = windowWidth > 0 && windowWidth < 768;
  const compactToolbarHeightClass = isCompactChart ? "h-[36px]" : "h-[40px]";

  const [tooltipData, setTooltipData] = useState<KLineData | null>(null);
  const isHoveringRef = useRef(false);

  // Keep addPrice ref in sync to avoid stale closure in subscribeBar
  useEffect(() => {
    addPriceRef.current = addPrice;
  }, [addPrice]);

  // Init chart
  useEffect(() => {
    if (!containerRef.current) return;
    const chart = init(containerRef.current, {
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      styles: getThemeStyles(theme, isCompactChart, isPhoneChart),
      formatter: {
        formatDate: ({ timestamp }: { timestamp: number }) => {
          const d = dayjs(timestamp);
          return d.format(isPhoneChart ? "MM-DD HH:mm" : "YYYY-MM-DD HH:mm");
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
        wsRef.current?.close();
        wsRef.current = null;

        const interval = periodToCandleInterval(period);
        const useRelayer =
          process.env.NEXT_PUBLIC_CHART_WS_SOURCE === "relayer";

        if (useRelayer) {
          if (!process.env.NEXT_PUBLIC_TWILIGHT_PRICE_WS) {
            console.error("NEXT_PUBLIC_TWILIGHT_PRICE_WS is not defined");
            return;
          }
          const ws = new WebSocket(process.env.NEXT_PUBLIC_TWILIGHT_PRICE_WS);
          ws.onopen = () => {
            ws.send(
              JSON.stringify({
                jsonrpc: "2.0",
                method: "subscribe_candle_data",
                params: { interval },
                id: 123,
              })
            );
          };
          ws.onmessage = (event) => {
            try {
              const parsed = JSON.parse(event.data);
              if (parsed.method !== "s_candle_data") return;
              const candle = parsed.params.result[0];
              const kd = transformCandleData(candle);
              callback(kd);
              addPriceRef.current(kd.close);
            } catch (err) {
              console.error(err);
            }
          };
          wsRef.current = ws;
        } else {
          const bi = BINANCE_INTERVAL_MAP[interval];
          if (!bi) return;
          if (!process.env.NEXT_PUBLIC_BINANCE_WS_URL) {
            console.error("NEXT_PUBLIC_BINANCE_WS_URL is not defined");
            return;
          }
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
        }
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
    chart.setPeriod(CANDLE_INTERVAL_TO_PERIOD[DEFAULT_TIME_INTERVAL]);

    // Drive the custom OHLCV overlay from crosshair + visible-range events
    const onCrosshairChange = (data?: unknown) => {
      const { kLineData } = (data ?? {}) as { kLineData?: KLineData };
      if (kLineData) {
        isHoveringRef.current = true;
        setTooltipData(kLineData);
      } else {
        isHoveringRef.current = false;
        const list = chartRef.current?.getDataList() ?? [];
        if (list.length > 0) setTooltipData(list[list.length - 1]);
      }
    };
    const onVisibleRangeChange = () => {
      if (isHoveringRef.current) return;
      const list = chartRef.current?.getDataList() ?? [];
      if (list.length > 0) setTooltipData(list[list.length - 1]);
    };
    chart.subscribeAction("onCrosshairChange", onCrosshairChange);
    chart.subscribeAction("onVisibleRangeChange", onVisibleRangeChange);

    // Keep a dedicated right-side price scale on wider widths so the Y-axis
    // remains legible. On phones, move labels inside the plot to preserve
    // candle area. In compact widths, also disable Y-axis scroll/zoom and clamp
    // range to ±10% of visible data to prevent swipe gestures pulling the axis
    // to volume values.
    chart.setPaneOptions({
      id: "candle_pane",
      axis: {
        inside: isPhoneChart,
        ...(isCompactChart && {
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
      height: isPhoneChart ? 40 : isCompactChart ? 52 : 80,
      axis: {
        inside: isPhoneChart,
        ...(isCompactChart && { scrollZoomEnabled: false }),
        ...(isPhoneChart && {
          axisLine: { show: false },
          tickLine: { show: false },
          tickText: { show: false },
        }),
      },
    });
    chart.overrideIndicator({
      name: "VOL",
      calcParams: [],
    });

    const container = containerRef.current;
    return () => {
      chart.unsubscribeAction("onCrosshairChange", onCrosshairChange);
      chart.unsubscribeAction("onVisibleRangeChange", onVisibleRangeChange);
      wsRef.current?.close();
      if (container) dispose(container);
      chartRef.current = null;
    };
  }, [isCompactChart, isPhoneChart, theme]);

  // Resize chart when container dimensions change
  useEffect(() => {
    chartRef.current?.resize();
  }, [width, height]);

  // Theme changes
  useEffect(() => {
    if (!chartRef.current) return;
    chartRef.current.setStyles(
      getThemeStyles(theme, isCompactChart, isPhoneChart)
    );
  }, [isCompactChart, isPhoneChart, theme]);

  const handleIntervalChange = useCallback(
    (item: (typeof TIME_INTERVALS)[number]) => {
      if (timeInterval === item.id) return;
      setTimeInterval(item.id);
      chartRef.current?.setPeriod(CANDLE_INTERVAL_TO_PERIOD[item.id]);
    },
    [timeInterval]
  );

  const overflowIntervals = isPhoneChart
    ? MOBILE_OVERFLOW_INTERVALS
    : COMPACT_OVERFLOW_INTERVALS;
  const visibleIntervals = isPhoneChart
    ? MOBILE_VISIBLE_INTERVALS
    : COMPACT_VISIBLE_INTERVALS;

  const overflowItem = overflowIntervals.find((i) => i.id === timeInterval);
  const overflowActive = !!overflowItem;
  const overflowLabel = overflowItem?.name ?? "More";

  const intervalName =
    TIME_INTERVALS.find((i) => i.id === timeInterval)?.name ?? "";
  const fmtPrice = (n: number) =>
    n.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  const fmtVol = (n: number) => n.toFixed(4);
  const fmtDate = (ts: number) =>
    dayjs(ts).format(isPhoneChart ? "MM-DD HH:mm" : "YYYY-MM-DD HH:mm");

  return (
    <div className="flex h-full w-full touch-none flex-col overflow-hidden">
      {/* Desktop: show all intervals inline */}
      {!isCompactChart && (
        <div className="hidden h-[40px] w-full shrink-0 items-center border-b bg-background/40 md:flex">
          {TIME_INTERVALS.map((item) => (
            <button
              className={cn(
                "h-full border-r px-4 text-sm text-primary/80 hover:text-theme",
                timeInterval === item.id && "text-theme"
              )}
              key={item.name}
              onClick={() => handleIntervalChange(item)}
            >
              {item.name}
            </button>
          ))}
          {onShowTrades && (
            <button
              className="ml-4 flex h-full items-center gap-1.5 px-2 text-primary/60 transition-colors hover:text-primary"
              title="Show Trades"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={onShowTrades}
            >
              <BookOpen className="h-3.5 w-3.5" />
              <span className="text-[11px] font-semibold tracking-wide text-primary/80">
                Trades
              </span>
            </button>
          )}
        </div>
      )}

      {/* Compact: show smaller visible set + overflow */}
      {isCompactChart && (
        <div
          className={cn(
            "flex w-full shrink-0 border-b bg-background/40",
            compactToolbarHeightClass
          )}
        >
          {visibleIntervals.map((item) => (
            <button
              className={cn(
                "border-r text-sm text-primary/80 hover:text-theme",
                isPhoneChart ? "px-3" : "px-3.5",
                timeInterval === item.id && "text-theme"
              )}
              key={item.name}
              onClick={() => handleIntervalChange(item)}
            >
              {item.name}
            </button>
          ))}
          <div className="relative border-r">
            <select
              value={overflowActive ? timeInterval : ""}
              onChange={(e) => {
                const found = TIME_INTERVALS.find(
                  (i) => i.id === e.target.value
                );
                if (found) handleIntervalChange(found);
              }}
              className={cn(
                "h-full appearance-none bg-transparent px-3 pr-6 text-sm text-primary/80 outline-none",
                overflowActive && "text-theme"
              )}
            >
              {!overflowActive && (
                <option value="" disabled>
                  {overflowLabel}
                </option>
              )}
              {overflowIntervals.map((item) => (
                <option key={item.name} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 text-xs text-primary/50">
              ▾
            </span>
          </div>
          {onShowTrades && !isPhoneChart && (
            <button
              className="ml-4 flex h-full items-center gap-1.5 px-2 text-primary/60 transition-colors hover:text-primary"
              title="Show Trades"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={onShowTrades}
            >
              <BookOpen className="h-3.5 w-3.5" />
              <span className="text-[11px] font-semibold tracking-wide text-primary/80">
                Trades
              </span>
            </button>
          )}
        </div>
      )}
      <div className="relative min-h-0 w-full flex-1 touch-none">
        <div ref={containerRef} className="h-full w-full" />
        {/* Custom OHLC tooltip overlay — compact / phone */}
        {isCompactChart && (
          <div
            className={cn(
              "pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center py-0.5 pl-2",
              isPhoneChart ? "pr-16" : "pr-20"
            )}
          >
            <div className="flex items-center gap-x-2 text-[10px] leading-none text-primary/70">
              {tooltipData ? (
                <>
                  <span>O: {fmtPrice(tooltipData.open)}</span>
                  <span>H: {fmtPrice(tooltipData.high)}</span>
                  <span>L: {fmtPrice(tooltipData.low)}</span>
                  <span>C: {fmtPrice(tooltipData.close)}</span>
                  {!isPhoneChart && tooltipData.volume !== undefined && (
                    <span>Vol: {fmtVol(tooltipData.volume)}</span>
                  )}
                </>
              ) : null}
            </div>
          </div>
        )}
        {/* Custom OHLCV tooltip overlay — desktop only */}
        {!isCompactChart && (
          <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center justify-between py-1 pl-2 pr-20">
            <div className="flex flex-wrap items-center gap-x-3 text-[11px] leading-none text-primary/75">
              {tooltipData ? (
                <>
                  <span>Time: {fmtDate(tooltipData.timestamp)}</span>
                  <span>Open: {fmtPrice(tooltipData.open)}</span>
                  <span>High: {fmtPrice(tooltipData.high)}</span>
                  <span>Low: {fmtPrice(tooltipData.low)}</span>
                  <span>Close: {fmtPrice(tooltipData.close)}</span>
                  {tooltipData.volume !== undefined && (
                    <span>Vol: {fmtVol(tooltipData.volume)}</span>
                  )}
                </>
              ) : null}
            </div>
            <div className="shrink-0 text-[12px] font-medium text-primary/50">
              BTCUSD · {intervalName}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default KLineChart;
