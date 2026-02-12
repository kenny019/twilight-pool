"use client";

import Button from "@/components/button";
import cn from '@/lib/cn';
import React, { useEffect, useMemo, useRef, useState } from "react";
import { createChart, ColorType, IChartApi, LineSeries } from 'lightweight-charts';
import { useApyChartData, ApyChartParams } from "@/lib/hooks/useApyChartData";

type TimePeriod = "1D" | "1W" | "1M";

const PERIOD_PARAMS: Record<TimePeriod, ApyChartParams> = {
  "1D": { range: "24 hours", step: "15 minutes", lookback: "24 hours" },
  "1W": { range: "7 days", step: "2 hours", lookback: "7 days" },
  "1M": { range: "30 days", step: "12 hours", lookback: "30 days" },
};

const ApyChart = () => {
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>("1D");
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<any>(null);

  const timePeriods: TimePeriod[] = ["1D", "1W", "1M"];

  const params = useMemo(() => PERIOD_PARAMS[selectedPeriod], [selectedPeriod]);
  const { data: chartData } = useApyChartData(params);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: 'rgb(156, 163, 175)',
        attributionLogo: false,
      },
      width: chartContainerRef.current.clientWidth,
      height: 256,
      grid: {
        vertLines: {
          color: 'rgba(156, 163, 175, 0.1)',
        },
        horzLines: {
          color: 'rgba(156, 163, 175, 0.1)',
        },
      },
      crosshair: {
        mode: 1,
      },
      rightPriceScale: {
        borderColor: 'rgba(156, 163, 175, 0.2)',
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
      },
      timeScale: {
        borderColor: 'rgba(156, 163, 175, 0.2)',
        timeVisible: true,
        secondsVisible: false,
      },
    });

    const lineSeries = chart.addSeries(LineSeries, {
      color: 'rgb(34, 197, 94)',
      lineWidth: 2,
      priceFormat: {
        type: 'custom',
        formatter: (value: number) => {
          const abs = Math.abs(value);
          if (abs >= 1e12) return `${(value / 1e12).toFixed(1)}T%`;
          if (abs >= 1e9) return `${(value / 1e9).toFixed(1)}B%`;
          if (abs >= 1e6) return `${(value / 1e6).toFixed(1)}M%`;
          if (abs >= 1e3) return `${(value / 1e3).toFixed(1)}K%`;
          if (abs < 1) return `${value.toFixed(4)}%`;
          return `${value.toFixed(2)}%`;
        },
        minMove: 0.0001,
      },
    });

    chartRef.current = chart;
    seriesRef.current = lineSeries;

    const handleResize = () => {
      if (chartContainerRef.current && chart) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (chart) {
        chart.remove();
      }
    };
  }, []);

  // Update data when chartData changes
  useEffect(() => {
    if (seriesRef.current && chartData) {
      seriesRef.current.setData(chartData);
    }
  }, [chartData]);

  return (
    <div className="space-y-4">
      <div className="flex justify-end items-center">
        <div className="flex space-x-2">
          {timePeriods.map((period) => (
            <Button
              key={period}
              variant={"ui"}
              size="small"
              onClick={() => setSelectedPeriod(period)}
              className={cn("px-4 py-2 hover:border-theme transition-colors", selectedPeriod === period && "border-theme")}
            >
              {period}
            </Button>
          ))}
        </div>
      </div>

      <div className="h-64 w-full rounded-lg border border-primary/20 p-4">
        <div ref={chartContainerRef} className="w-full h-full" />
      </div>
    </div>
  );
};

export default ApyChart;
