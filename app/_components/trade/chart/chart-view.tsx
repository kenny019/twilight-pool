"use client";
import { Tabs, TabsList, TabsTrigger } from "@/components/tabs";
import React, { useState } from "react";

const timeScaleTabs = ["1s", "1m", "5m", "15m", "1h", "4h"] as const;

const ChartView = () => {
  const [view, setView] = useState<"chart" | "overview">("chart");

  return (
    <div className="h-[650px] w-full border border-t-0">
      <div className="flex w-full items-center justify-between border-b px-6 py-5">
        <Tabs defaultValue="1h">
          <TabsList variant="ghost" className="font-ui">
            {timeScaleTabs.map((value) => (
              <TabsTrigger variant="ghost" value={value} key={value}>
                {value}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <Tabs defaultValue="original">
          <TabsList>
            <TabsTrigger value="original">Original</TabsTrigger>
            <TabsTrigger value="trading_view">Trading View</TabsTrigger>
            <TabsTrigger value="depths">Depths</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      {/* chart will go here */}
    </div>
  );
};

export default ChartView;
