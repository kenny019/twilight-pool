"use client";

import Button from "@/components/button";
import { Text } from "@/components/typography";
import cn from '@/lib/cn';
import React, { useEffect, useRef, useState } from "react";
import { createChart, ColorType, IChartApi, LineSeries } from 'lightweight-charts';

type TimePeriod = "1D" | "1W" | "1M" | "6M" | "1Y";

const ApyChart = () => {
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>("1D");
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<any>(null);

  const timePeriods: TimePeriod[] = ["1D", "1W", "1M", "6M", "1Y"];

  // Generate realistic APY data starting from 0% with 0.5% increments
  const generateRealisticAPYData = (period: TimePeriod) => {
    const now = Date.now() / 1000;
    const data = [];

    let points: number;
    let interval: number; // in seconds

    switch (period) {
      case "1D":
        points = 24; // hourly points
        interval = 60 * 60; // 1 hour
        break;
      case "1W":
        points = 7; // daily points
        interval = 60 * 60 * 24; // 1 day
        break;
      case "1M":
        points = 30; // daily points
        interval = 60 * 60 * 24; // 1 day
        break;
      case "6M":
        points = 26; // weekly points
        interval = 60 * 60 * 24 * 7; // 1 week
        break;
      case "1Y":
        points = 12; // monthly points
        interval = 60 * 60 * 24 * 30; // ~1 month
        break;
      default:
        points = 24;
        interval = 60 * 60;
    }

    // Create a straight line at 0% APY
    for (let i = 0; i < points; i++) {
      data.push({
        time: (now - (points - 1 - i) * interval) as any,
        value: 0.0, // Straight line at 0%
      });
    }

    return data;
  };

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Create chart
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: 'rgb(156, 163, 175)', // text-gray-400
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

    // Add line series
    const lineSeries = chart.addSeries(LineSeries, {
      color: 'rgb(34, 197, 94)', // green-500
      lineWidth: 2,
      priceFormat: {
        type: 'percent',
        precision: 2,
      },
    });

    // Set initial data
    lineSeries.setData(generateRealisticAPYData(selectedPeriod));

    chartRef.current = chart;
    seriesRef.current = lineSeries;

    // Handle resize
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update data when period changes
  useEffect(() => {
    if (seriesRef.current) {
      seriesRef.current.setData(generateRealisticAPYData(selectedPeriod));
    }
  }, [selectedPeriod]);

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