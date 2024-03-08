"use client";
import { useGrid } from "@/lib/providers/grid";
import { useTwilight } from "@/lib/providers/twilight";
import {
  ColorType,
  CrosshairMode,
  IChartApi,
  createChart,
} from "lightweight-charts";
import { useTheme } from "next-themes";
import React, {
  createContext,
  forwardRef,
  useEffect,
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

const Chart = forwardRef<IChartApi | void, Props>(
  ({ children, container }, ref) => {
    const { width, height } = useGrid();

    const { theme } = useTheme();

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
                color: theme === "light" ? "#ffffff" : "#000",
              },
              textColor:
                theme === "light"
                  ? "rgba(0, 0, 0, 1)"
                  : "rgba(255, 255, 255, 0.9)",
            },
            grid: {
              vertLines: {
                color:
                  theme === "light"
                    ? "rgba(0, 0, 0, 0.4)"
                    : "rgba(197, 203, 206, 0.12)",
              },
              horzLines: {
                color:
                  theme === "light"
                    ? "rgba(0, 0, 0, 0.4)"
                    : "rgba(197, 203, 206, 0.12)",
              },
            },
            crosshair: {
              mode: CrosshairMode.Normal,
            },
            rightPriceScale: {
              borderColor:
                theme === "light"
                  ? "rgba(0, 0, 0, 0.6)"
                  : "rgba(255, 255, 255, 0.12)",
            },
            timeScale: {
              borderColor:
                theme === "light"
                  ? "rgba(0, 0, 0, 0.6)"
                  : "rgba(255, 255, 255, 0.12)",
              timeVisible: true,
              secondsVisible: false,
            },
          });
          this._api.timeScale().fitContent();
        }
        return this._api;
      },
      free() {
        try {
          if (this._api) {
            this._api.remove();
          }
        } catch (err) {
          console.error(err);
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

    useEffect(() => {
      const currentRef = chartApiRef.current;
      const chart = currentRef.api();

      if (!chart) return;

      chart.applyOptions({
        layout: {
          background: {
            type: ColorType.Solid,
            color: theme === "light" ? "#ffffff" : "#000",
          },
          textColor:
            theme === "light" ? "rgba(0, 0, 0, 1)" : "rgba(255, 255, 255, 0.9)",
        },
        grid: {
          vertLines: {
            color:
              theme === "light"
                ? "rgba(0, 0, 0, 0.4)"
                : "rgba(197, 203, 206, 0.12)",
          },
          horzLines: {
            color:
              theme === "light"
                ? "rgba(0, 0, 0, 0.4)"
                : "rgba(197, 203, 206, 0.12)",
          },
        },
        crosshair: {
          mode: CrosshairMode.Normal,
        },
        rightPriceScale: {
          borderColor:
            theme === "light"
              ? "rgba(0, 0, 0, 0.6)"
              : "rgba(255, 255, 255, 0.12)",
        },
        timeScale: {
          borderColor:
            theme === "light"
              ? "rgba(0, 0, 0, 0.6)"
              : "rgba(255, 255, 255, 0.12)",
        },
      });
    }, [theme]);

    useImperativeHandle(ref, () => chartApiRef.current.api(), []);

    return (
      <chartContext.Provider value={chartApiRef.current}>
        {children}
      </chartContext.Provider>
    );
  }
);

Chart.displayName = "Chart";

export default Chart;
