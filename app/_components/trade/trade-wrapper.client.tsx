"use client";
import { Tabs, TabsList, TabsTrigger } from "@/components/tabs";
import React, { useState } from "react";
import ChartView from "./chart/chart-view";

const TradeWrapper = () => {
  const [tradeView, setTradeView] = useState<"chart" | "overview">("chart");

  return (
    <div>
      <div className="w-full border px-10 pt-6">
        <Tabs defaultValue={tradeView}>
          <TabsList variant="underline">
            <TabsTrigger
              onClick={() => setTradeView("chart")}
              className="pb-4"
              variant="underline"
              value="chart"
            >
              Chart
            </TabsTrigger>
            <TabsTrigger
              onClick={() => setTradeView("overview")}
              className="pb-4"
              variant="underline"
              value="overview"
            >
              Overview
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      {tradeView === "chart" ? <ChartView /> : <></>}
    </div>
  );
};

export default TradeWrapper;
