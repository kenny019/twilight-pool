"use client";
import React, {
  forwardRef,
  useContext,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
} from "react";
import { chartContext } from "./chart.client";
import { ISeriesApi, UTCTimestamp } from "lightweight-charts";
import { CandleData } from "@/lib/api/rest";

type Props = {
  data: CandleData[];
  children?: React.ReactNode;
};

type SeriesApi = {
  _api?: ISeriesApi<"Candlestick">;
  api: () => ISeriesApi<"Candlestick"> | void;
  free: () => void;
  lastUpdatedTime: number;
};

const Series = forwardRef<ISeriesApi<"Candlestick"> | void, Props>(
  (props, ref) => {
    const { children, data } = props;
    const parent = useContext(chartContext);

    const context = useRef<SeriesApi>({
      lastUpdatedTime: 0,
      _api: undefined,
      api() {
        if (!this._api) {
          if (!parent._api) {
            parent.api();
          }

          console.log("series calling parent._api", parent._api);

          this._api = parent._api?.addCandlestickSeries({
            upColor: "#5FDB66",
            downColor: "#F84952",
            wickUpColor: "#5FDB66",
            wickDownColor: "#F84952",
          });

          parent._api?.timeScale().fitContent();

          const chartData = data.map((candleData) => {
            const time = Math.floor(
              Date.parse(candleData.start) / 1000
            ) as UTCTimestamp;
            return {
              close: parseFloat(candleData.close),
              open: parseFloat(candleData.open),
              high: parseFloat(candleData.high),
              low: parseFloat(candleData.low),
              time,
            };
          });

          this._api?.setData(chartData);
          // console.log(this._api?.data());
        }
        return this._api;
      },
      free() {
        if (this._api) {
          parent.free();
        }
      },
    });

    useLayoutEffect(() => {
      const currentRef = context.current;
      currentRef.api();

      return () => currentRef.free();
    }, []);

    useImperativeHandle(ref, () => context.current.api(), []);

    return <>{children}</>;
  }
);

Series.displayName = "Series";

export default Series;
