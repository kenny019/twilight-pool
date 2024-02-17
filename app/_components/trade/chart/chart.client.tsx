"use client";
import { useGrid } from "@/lib/providers/grid";
import {
  ColorType,
  CrosshairMode,
  IChartApi,
  createChart,
} from "lightweight-charts";
import React, {
  createContext,
  forwardRef,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
} from "react";

export const chartContext = createContext<ChartApi>({
  _api: undefined,
  api: () => {},
  free: () => {},
});

type ChartApi = {
  _api?: IChartApi;
  api: () => IChartApi | void;
  free: () => void;
};

const CHART_X_PADDING = 20;
const CHART_Y_PADDING = 40;

type Props = {
  container: HTMLElement;
  children: React.ReactNode;
};

const Chart = forwardRef<IChartApi | void, Props>((props, ref) => {
  const { children, container } = props;

  const { width, height } = useGrid();

  const chartApiRef = useRef<ChartApi>({
    api() {
      if (!this._api) {
        if (!container) return;
        this._api = createChart(container, {
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
        this._api.timeScale().fitContent();
      }
      return this._api;
    },
    free() {
      if (this._api) {
        this._api.remove();
      }
    },
  });

  useLayoutEffect(() => {
    const currentRef = chartApiRef.current;
    const chart = currentRef.api();

    if (!chart) return;

    chart.applyOptions({
      width: width > 0 ? width - CHART_X_PADDING : 0,
      height: height > 0 ? height - CHART_Y_PADDING : 0,
    });
  }, [width, height]);

  useLayoutEffect(() => {
    const currentRef = chartApiRef.current;
    currentRef.api();
  }, []);

  useImperativeHandle(ref, () => chartApiRef.current.api(), []);

  return (
    <chartContext.Provider value={chartApiRef.current}>
      {children}
    </chartContext.Provider>
  );
});

Chart.displayName = "Chart";

export default Chart;
