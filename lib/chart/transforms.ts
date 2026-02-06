import { CandleData } from "@/lib/api/rest";
import { CandleInterval } from "@/lib/types";
import type { KLineData, PeriodType } from "klinecharts";

export function transformCandleData(candle: CandleData): KLineData {
  return {
    timestamp: Date.parse(candle.start),
    open: parseFloat(candle.open),
    high: parseFloat(candle.high),
    low: parseFloat(candle.low),
    close: parseFloat(candle.close),
    volume: parseFloat(candle.btc_volume),
  };
}

export function transformBinanceKline(k: {
  t: number;
  o: string;
  h: string;
  l: string;
  c: string;
  v: string;
}): KLineData {
  return {
    timestamp: k.t,
    open: parseFloat(k.o),
    high: parseFloat(k.h),
    low: parseFloat(k.l),
    close: parseFloat(k.c),
    volume: parseFloat(k.v),
  };
}

export const CANDLE_INTERVAL_TO_PERIOD: Record<
  string,
  { span: number; type: PeriodType }
> = {
  [CandleInterval.ONE_MINUTE]: { span: 1, type: "minute" },
  [CandleInterval.FIVE_MINUTE]: { span: 5, type: "minute" },
  [CandleInterval.FIFTEEN_MINUTE]: { span: 15, type: "minute" },
  [CandleInterval.ONE_HOUR]: { span: 1, type: "hour" },
  [CandleInterval.FOUR_HOUR]: { span: 4, type: "hour" },
  [CandleInterval.EIGHT_HOUR]: { span: 8, type: "hour" },
  [CandleInterval.TWELVE_HOUR]: { span: 12, type: "hour" },
  [CandleInterval.ONE_DAY]: { span: 1, type: "day" },
  [CandleInterval.ONE_DAY_CHANGE]: { span: 1, type: "day" },
};

const PERIOD_TO_CANDLE_INTERVAL: Record<string, CandleInterval> = {
  "1_minute": CandleInterval.ONE_MINUTE,
  "5_minute": CandleInterval.FIVE_MINUTE,
  "15_minute": CandleInterval.FIFTEEN_MINUTE,
  "1_hour": CandleInterval.ONE_HOUR,
  "4_hour": CandleInterval.FOUR_HOUR,
  "8_hour": CandleInterval.EIGHT_HOUR,
  "12_hour": CandleInterval.TWELVE_HOUR,
  "1_day": CandleInterval.ONE_DAY,
};

export function periodToCandleInterval(period: {
  span: number;
  type: string;
}): CandleInterval {
  return (
    PERIOD_TO_CANDLE_INTERVAL[`${period.span}_${period.type}`] ??
    CandleInterval.ONE_MINUTE
  );
}

export const darkThemeStyles = {
  grid: {
    show: true,
    horizontal: {
      show: true,
      size: 1,
      color: "rgba(197, 203, 206, 0.12)",
      style: "dashed" as const,
      dashedValue: [2, 4],
    },
    vertical: {
      show: true,
      size: 1,
      color: "rgba(197, 203, 206, 0.12)",
      style: "dashed" as const,
      dashedValue: [2, 4],
    },
  },
  candle: {
    type: "candle_solid" as const,
    bar: {
      upColor: "#5FDB66",
      downColor: "#F84952",
      noChangeColor: "#5FDB66",
      upBorderColor: "#5FDB66",
      downBorderColor: "#F84952",
      noChangeBorderColor: "#5FDB66",
      upWickColor: "#5FDB66",
      downWickColor: "#F84952",
      noChangeWickColor: "#5FDB66",
    },
    priceMark: {
      show: true,
      high: {
        show: true,
        color: "rgba(255, 255, 255, 0.65)",
        textOffset: 5,
        textSize: 10,
        textFamily: "inherit",
        textWeight: "normal",
      },
      low: {
        show: true,
        color: "rgba(255, 255, 255, 0.65)",
        textOffset: 5,
        textSize: 10,
        textFamily: "inherit",
        textWeight: "normal",
      },
      last: {
        show: true,
        upColor: "#5FDB66",
        downColor: "#F84952",
        noChangeColor: "#5FDB66",
        line: {
          show: true,
          style: "dashed" as const,
          dashedValue: [4, 4],
          size: 1,
        },
        text: {
          show: true,
          style: "fill" as const,
          size: 12,
          paddingLeft: 4,
          paddingTop: 3,
          paddingRight: 4,
          paddingBottom: 3,
          color: "#000000",
          family: "inherit",
          weight: "normal",
          borderRadius: 2,
        },
      },
    },
    tooltip: {
      showRule: "always" as const,
      showType: "standard" as const,
      custom: [
        { title: "O", value: "{open}" },
        { title: "H", value: "{high}" },
        { title: "L", value: "{low}" },
        { title: "C", value: "{close}" },
        { title: "Vol", value: "{volume}" },
      ],
      text: {
        size: 12,
        family: "inherit",
        weight: "normal",
        color: "rgba(255, 255, 255, 0.9)",
        marginLeft: 8,
        marginTop: 6,
        marginRight: 8,
        marginBottom: 0,
      },
    },
  },
  indicator: {
    ohlc: {
      upColor: "rgba(95, 219, 102, 0.7)",
      downColor: "rgba(248, 73, 82, 0.7)",
      noChangeColor: "rgba(95, 219, 102, 0.7)",
    },
    bars: [
      {
        style: "fill" as const,
        borderStyle: "solid" as const,
        borderSize: 1,
        borderDashedValue: [2, 2],
        upColor: "rgba(95, 219, 102, 0.5)",
        downColor: "rgba(248, 73, 82, 0.5)",
        noChangeColor: "rgba(95, 219, 102, 0.5)",
      },
    ],
    lines: [
      { size: 1, smooth: false, style: "solid" as const, color: "#FF9600" },
      { size: 1, smooth: false, style: "solid" as const, color: "#9D65C9" },
      { size: 1, smooth: false, style: "solid" as const, color: "#2196F3" },
      { size: 1, smooth: false, style: "solid" as const, color: "#E040FB" },
      { size: 1, smooth: false, style: "solid" as const, color: "#00BCD4" },
    ],
    tooltip: {
      showRule: "always" as const,
      showType: "standard" as const,
      text: {
        size: 12,
        family: "inherit",
        weight: "normal",
        color: "rgba(255, 255, 255, 0.7)",
        marginTop: 6,
        marginRight: 8,
        marginBottom: 0,
        marginLeft: 8,
      },
    },
  },
  xAxis: {
    show: true,
    size: "auto" as const,
    axisLine: {
      show: true,
      color: "rgba(255, 255, 255, 0.12)",
      size: 1,
    },
    tickText: {
      show: true,
      color: "rgba(255, 255, 255, 0.5)",
      family: "inherit",
      weight: "normal",
      size: 11,
      marginStart: 4,
      marginEnd: 4,
    },
    tickLine: {
      show: true,
      size: 1,
      length: 3,
      color: "rgba(255, 255, 255, 0.12)",
    },
  },
  yAxis: {
    show: true,
    size: "auto" as const,
    position: "right" as const,
    type: "normal" as const,
    axisLine: {
      show: true,
      color: "rgba(255, 255, 255, 0.12)",
      size: 1,
    },
    tickText: {
      show: true,
      color: "rgba(255, 255, 255, 0.5)",
      family: "inherit",
      weight: "normal",
      size: 11,
      marginStart: 4,
      marginEnd: 4,
    },
    tickLine: {
      show: true,
      size: 1,
      length: 3,
      color: "rgba(255, 255, 255, 0.12)",
    },
  },
  crosshair: {
    show: true,
    horizontal: {
      show: true,
      line: {
        show: true,
        style: "dashed" as const,
        dashedValue: [4, 2],
        size: 1,
        color: "rgba(255, 255, 255, 0.3)",
      },
      text: {
        show: true,
        style: "fill" as const,
        color: "#000000",
        size: 12,
        family: "inherit",
        weight: "normal",
        borderRadius: 2,
        paddingLeft: 4,
        paddingRight: 4,
        paddingTop: 3,
        paddingBottom: 3,
        backgroundColor: "rgba(255, 255, 255, 0.85)",
      },
    },
    vertical: {
      show: true,
      line: {
        show: true,
        style: "dashed" as const,
        dashedValue: [4, 2],
        size: 1,
        color: "rgba(255, 255, 255, 0.3)",
      },
      text: {
        show: true,
        style: "fill" as const,
        color: "#000000",
        size: 12,
        family: "inherit",
        weight: "normal",
        borderRadius: 2,
        paddingLeft: 4,
        paddingRight: 4,
        paddingTop: 3,
        paddingBottom: 3,
        backgroundColor: "rgba(255, 255, 255, 0.85)",
      },
    },
  },
  separator: {
    size: 1,
    color: "rgba(255, 255, 255, 0.08)",
    fill: true,
    activeBackgroundColor: "rgba(255, 255, 255, 0.05)",
  },
};

export const lightThemeStyles = {
  grid: {
    show: true,
    horizontal: {
      show: true,
      size: 1,
      color: "rgba(0, 0, 0, 0.06)",
      style: "dashed" as const,
      dashedValue: [2, 4],
    },
    vertical: {
      show: true,
      size: 1,
      color: "rgba(0, 0, 0, 0.06)",
      style: "dashed" as const,
      dashedValue: [2, 4],
    },
  },
  candle: {
    type: "candle_solid" as const,
    bar: {
      upColor: "#5FDB66",
      downColor: "#F84952",
      noChangeColor: "#5FDB66",
      upBorderColor: "#5FDB66",
      downBorderColor: "#F84952",
      noChangeBorderColor: "#5FDB66",
      upWickColor: "#5FDB66",
      downWickColor: "#F84952",
      noChangeWickColor: "#5FDB66",
    },
    priceMark: {
      show: true,
      high: {
        show: true,
        color: "rgba(0, 0, 0, 0.65)",
        textOffset: 5,
        textSize: 10,
        textFamily: "inherit",
        textWeight: "normal",
      },
      low: {
        show: true,
        color: "rgba(0, 0, 0, 0.65)",
        textOffset: 5,
        textSize: 10,
        textFamily: "inherit",
        textWeight: "normal",
      },
      last: {
        show: true,
        upColor: "#5FDB66",
        downColor: "#F84952",
        noChangeColor: "#5FDB66",
        line: {
          show: true,
          style: "dashed" as const,
          dashedValue: [4, 4],
          size: 1,
        },
        text: {
          show: true,
          style: "fill" as const,
          size: 12,
          paddingLeft: 4,
          paddingTop: 3,
          paddingRight: 4,
          paddingBottom: 3,
          color: "#ffffff",
          family: "inherit",
          weight: "normal",
          borderRadius: 2,
        },
      },
    },
    tooltip: {
      showRule: "always" as const,
      showType: "standard" as const,
      custom: [
        { title: "O", value: "{open}" },
        { title: "H", value: "{high}" },
        { title: "L", value: "{low}" },
        { title: "C", value: "{close}" },
        { title: "Vol", value: "{volume}" },
      ],
      text: {
        size: 12,
        family: "inherit",
        weight: "normal",
        color: "rgba(0, 0, 0, 0.9)",
        marginLeft: 8,
        marginTop: 6,
        marginRight: 8,
        marginBottom: 0,
      },
    },
  },
  indicator: {
    ohlc: {
      upColor: "rgba(95, 219, 102, 0.8)",
      downColor: "rgba(248, 73, 82, 0.8)",
      noChangeColor: "rgba(95, 219, 102, 0.8)",
    },
    bars: [
      {
        style: "fill" as const,
        borderStyle: "solid" as const,
        borderSize: 1,
        borderDashedValue: [2, 2],
        upColor: "rgba(95, 219, 102, 0.4)",
        downColor: "rgba(248, 73, 82, 0.4)",
        noChangeColor: "rgba(95, 219, 102, 0.4)",
      },
    ],
    lines: [
      { size: 1, smooth: false, style: "solid" as const, color: "#FF9600" },
      { size: 1, smooth: false, style: "solid" as const, color: "#9D65C9" },
      { size: 1, smooth: false, style: "solid" as const, color: "#2196F3" },
      { size: 1, smooth: false, style: "solid" as const, color: "#E040FB" },
      { size: 1, smooth: false, style: "solid" as const, color: "#00BCD4" },
    ],
    tooltip: {
      showRule: "always" as const,
      showType: "standard" as const,
      text: {
        size: 12,
        family: "inherit",
        weight: "normal",
        color: "rgba(0, 0, 0, 0.7)",
        marginTop: 6,
        marginRight: 8,
        marginBottom: 0,
        marginLeft: 8,
      },
    },
  },
  xAxis: {
    show: true,
    size: "auto" as const,
    axisLine: {
      show: true,
      color: "rgba(0, 0, 0, 0.12)",
      size: 1,
    },
    tickText: {
      show: true,
      color: "rgba(0, 0, 0, 0.5)",
      family: "inherit",
      weight: "normal",
      size: 11,
      marginStart: 4,
      marginEnd: 4,
    },
    tickLine: {
      show: true,
      size: 1,
      length: 3,
      color: "rgba(0, 0, 0, 0.12)",
    },
  },
  yAxis: {
    show: true,
    size: "auto" as const,
    position: "right" as const,
    type: "normal" as const,
    axisLine: {
      show: true,
      color: "rgba(0, 0, 0, 0.12)",
      size: 1,
    },
    tickText: {
      show: true,
      color: "rgba(0, 0, 0, 0.5)",
      family: "inherit",
      weight: "normal",
      size: 11,
      marginStart: 4,
      marginEnd: 4,
    },
    tickLine: {
      show: true,
      size: 1,
      length: 3,
      color: "rgba(0, 0, 0, 0.12)",
    },
  },
  crosshair: {
    show: true,
    horizontal: {
      show: true,
      line: {
        show: true,
        style: "dashed" as const,
        dashedValue: [4, 2],
        size: 1,
        color: "rgba(0, 0, 0, 0.2)",
      },
      text: {
        show: true,
        style: "fill" as const,
        color: "#ffffff",
        size: 12,
        family: "inherit",
        weight: "normal",
        borderRadius: 2,
        paddingLeft: 4,
        paddingRight: 4,
        paddingTop: 3,
        paddingBottom: 3,
        backgroundColor: "rgba(0, 0, 0, 0.75)",
      },
    },
    vertical: {
      show: true,
      line: {
        show: true,
        style: "dashed" as const,
        dashedValue: [4, 2],
        size: 1,
        color: "rgba(0, 0, 0, 0.2)",
      },
      text: {
        show: true,
        style: "fill" as const,
        color: "#ffffff",
        size: 12,
        family: "inherit",
        weight: "normal",
        borderRadius: 2,
        paddingLeft: 4,
        paddingRight: 4,
        paddingTop: 3,
        paddingBottom: 3,
        backgroundColor: "rgba(0, 0, 0, 0.75)",
      },
    },
  },
  separator: {
    size: 1,
    color: "rgba(0, 0, 0, 0.06)",
    fill: true,
    activeBackgroundColor: "rgba(0, 0, 0, 0.03)",
  },
};

export function getThemeStyles(theme: string | undefined): Record<string, any> {
  return theme === "light" ? lightThemeStyles : darkThemeStyles;
}

export const apyChartStyles = {
  grid: {
    horizontal: {
      show: true,
      color: "rgba(156, 163, 175, 0.1)",
      style: "dashed" as const,
      dashedValue: [2, 4],
    },
    vertical: {
      show: false,
    },
  },
  candle: {
    type: "area" as const,
    area: {
      lineSize: 2,
      lineColor: "rgb(34, 197, 94)",
      smooth: true,
      value: "close",
      backgroundColor: [
        { offset: 0, color: "rgba(34, 197, 94, 0.25)" },
        { offset: 1, color: "rgba(34, 197, 94, 0.01)" },
      ],
      point: {
        show: false,
      },
    },
    tooltip: {
      showRule: "follow_cross" as const,
      showType: "standard" as const,
      custom: [{ title: "APY", value: "{close}" }],
      text: {
        size: 12,
        color: "rgba(156, 163, 175, 0.9)",
      },
    },
    priceMark: {
      show: false,
    },
  },
  xAxis: {
    axisLine: { show: false },
    tickLine: { show: false },
    tickText: {
      show: true,
      color: "rgb(156, 163, 175)",
      size: 10,
    },
  },
  yAxis: {
    position: "right" as const,
    axisLine: { show: false },
    tickLine: { show: false },
    tickText: {
      show: true,
      color: "rgb(156, 163, 175)",
      size: 10,
    },
  },
  crosshair: {
    show: true,
    horizontal: {
      show: true,
      line: {
        show: true,
        style: "dashed" as const,
        dashedValue: [4, 2],
        size: 1,
        color: "rgba(156, 163, 175, 0.3)",
      },
      text: {
        show: true,
        backgroundColor: "rgba(156, 163, 175, 0.8)",
        color: "#000000",
        size: 11,
        borderRadius: 2,
      },
    },
    vertical: {
      show: true,
      line: {
        show: true,
        style: "dashed" as const,
        dashedValue: [4, 2],
        size: 1,
        color: "rgba(156, 163, 175, 0.3)",
      },
      text: {
        show: true,
        backgroundColor: "rgba(156, 163, 175, 0.8)",
        color: "#000000",
        size: 11,
        borderRadius: 2,
      },
    },
  },
  separator: { show: false },
};
