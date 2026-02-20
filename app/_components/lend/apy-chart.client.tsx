"use client";

import Button from "@/components/button";
import cn from '@/lib/cn';
import React, { useMemo, useState, useCallback } from "react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { useApyChartData, ApyChartParams } from "@/lib/hooks/useApyChartData";

type TimePeriod = "1D" | "1W" | "1M";

const PERIOD_PARAMS: Record<TimePeriod, ApyChartParams> = {
  "1D": { range: "24 hours", step: "15 minutes", lookback: "24 hours" },
  "1W": { range: "7 days", step: "2 hours", lookback: "7 days" },
  "1M": { range: "30 days", step: "12 hours", lookback: "30 days" },
};

function formatApy(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1e12) return `${(value / 1e12).toFixed(1)}T%`;
  if (abs >= 1e9) return `${(value / 1e9).toFixed(1)}B%`;
  if (abs >= 1e6) return `${(value / 1e6).toFixed(1)}M%`;
  if (abs >= 1e3) return `${(value / 1e3).toFixed(1)}K%`;
  if (abs < 1) return `${value.toFixed(4)}%`;
  return `${value.toFixed(2)}%`;
}

const GREEN = "rgb(34, 197, 94)";

const ApyChart = () => {
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>("1D");
  const timePeriods: TimePeriod[] = ["1D", "1W", "1M"];

  const params = useMemo(() => PERIOD_PARAMS[selectedPeriod], [selectedPeriod]);
  const { data: chartData } = useApyChartData(params);

  const tickFormatter = useCallback((time: number) => {
    const d = new Date(time * 1000);
    if (selectedPeriod === "1D") {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }, [selectedPeriod]);

  const tooltipLabelFormatter = useCallback((label: any) => {
    const time = Number(label);
    const d = new Date(time * 1000);
    if (selectedPeriod === "1D") {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
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
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData ?? []}>
            <defs>
              <linearGradient id="apyGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={GREEN} stopOpacity={0.3} />
                <stop offset="100%" stopColor={GREEN} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(156, 163, 175, 0.1)" />
            <XAxis
              dataKey="time"
              tickFormatter={tickFormatter}
              stroke="rgb(156, 163, 175)"
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: 'rgba(156, 163, 175, 0.2)' }}
            />
            <YAxis
              tickFormatter={formatApy}
              stroke="rgb(156, 163, 175)"
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: 'rgba(156, 163, 175, 0.2)' }}
              width={60}
            />
            <Tooltip
              labelFormatter={tooltipLabelFormatter}
              formatter={(value: any) => [formatApy(Number(value ?? 0)), "APY"]}
              contentStyle={{
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                border: '1px solid rgba(156, 163, 175, 0.2)',
                borderRadius: '8px',
                color: 'rgb(156, 163, 175)',
              }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke={GREEN}
              strokeWidth={2}
              fill="url(#apyGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ApyChart;
