import { useGrid } from "@/lib/providers/grid";
import { createChart, ColorType, CrosshairMode } from "lightweight-charts";
import { useTheme } from "next-themes";
import React, { useEffect, useRef } from "react";

const data = [
  // placeholder data untill price feed works consistently
  { time: "2018-12-22", open: 75.16, high: 82.84, low: 36.16, close: 45.72 },
  { time: "2018-12-23", open: 45.12, high: 53.9, low: 45.12, close: 48.09 },
  { time: "2018-12-24", open: 60.71, high: 60.71, low: 53.39, close: 59.29 },
  { time: "2018-12-25", open: 68.26, high: 68.26, low: 59.04, close: 60.5 },
  { time: "2018-12-26", open: 67.71, high: 105.85, low: 66.67, close: 91.04 },
  { time: "2018-12-27", open: 91.04, high: 121.4, low: 82.7, close: 111.4 },
  {
    time: "2018-12-28",
    open: 111.51,
    high: 142.83,
    low: 103.34,
    close: 131.25,
  },
  {
    time: "2018-12-29",
    open: 131.33,
    high: 151.17,
    low: 77.68,
    close: 96.43,
  },
  { time: "2018-12-30", open: 106.33, high: 110.2, low: 90.39, close: 98.1 },
  {
    time: "2018-12-31",
    open: 109.87,
    high: 114.69,
    low: 85.66,
    close: 111.26,
  },
];

const CHART_X_PADDING = 20;
const CHART_Y_PADDING = 40;

const Chart = () => {
  const { theme } = useTheme();

  const { width, height } = useGrid();

  const chartContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      width: width > 0 ? width - CHART_X_PADDING : 0,
      height: height > 0 ? height - CHART_Y_PADDING : 0,
      layout: {
        background: {
          type: ColorType.Solid,
          color: "#000",
        },
        textColor: "rgba(255, 255, 255, 0.9)",
      },
      grid: {
        vertLines: {
          color: "rgba(197, 203, 206, 0.12)",
        },
        horzLines: {
          color: "rgba(197, 203, 206, 0.12)",
        },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
      },
      rightPriceScale: {
        borderColor: "rgba(255, 255, 255, 0.12)",
      },
      timeScale: {
        borderColor: "rgba(255, 255, 255, 0.12)",
      },
    });

    chart.timeScale().applyOptions({
      barSpacing: 20,
    });

    const newSeries = chart.addCandlestickSeries({
      upColor: "#5FDB66",
      downColor: "#F84952",
      wickUpColor: "#5FDB66",
      wickDownColor: "#F84952",
    });

    newSeries.setData(data);

    return () => {
      chart.remove();
    };
  }, [theme, width, height]);

  return <div ref={chartContainerRef} />;
};
export default Chart;
