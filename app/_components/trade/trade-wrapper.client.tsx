"use client";
import { Tabs, TabsList, TabsTrigger } from "@/components/tabs";
import React, { useEffect, useRef, useState } from "react";
import { Layout, Responsive as ResponsiveGridLayout } from "react-grid-layout";
import ChartView from "./chart/chart-view";
import PositionsWrapper from "./chart/positions/positions-wrapper";
import useWindow from "@/lib/hooks/useWindow";

function DragWrapper({ title }: { title?: string }) {
  return (
    <>
      <div className="draggable min-h-[38px] w-full cursor-grab border-b py-2 pl-3 text-sm active:cursor-grabbing">
        {title}
      </div>
    </>
  );
}

const TradeWrapper = () => {
  const { width: windowWidth } = useWindow();

  const layout = [
    { i: "item1", x: 0, y: 0, w: 2, h: 10 },
    { i: "item2", x: 2, y: 0, w: 4, h: 10 },
    { i: "item3", x: 6, y: 0, w: 2, h: 10 },
  ];

  return (
    <ResponsiveGridLayout
      layouts={{ lg: layout }}
      cols={{ lg: 8, md: 8, sm: 4, xxs: 4 }}
      rowHeight={30}
      width={windowWidth - 12}
      draggableHandle=".draggable"
      className="overflow-hidden"
    >
      <div className="border bg-background" key="item1">
        <DragWrapper title="Orders" />
      </div>
      <div className="border bg-background" key="item2">
        <DragWrapper title="Chart" />
      </div>
      <div className="border bg-background" key="item3">
        <DragWrapper title="Orderbook" />
      </div>
    </ResponsiveGridLayout>
    // <div>
    //   <div className="w-full border-x border-b px-10 pt-6">
    //     <Tabs defaultValue={tradeView}>
    //       <TabsList variant="underline">
    //         <TabsTrigger
    //           onClick={() => setTradeView("chart")}
    //           className="pb-4"
    //           variant="underline"
    //           value="chart"
    //         >
    //           Chart
    //         </TabsTrigger>
    //         <TabsTrigger
    //           onClick={() => setTradeView("overview")}
    //           className="pb-4"
    //           variant="underline"
    //           value="overview"
    //         >
    //           Overview
    //         </TabsTrigger>
    //       </TabsList>
    //     </Tabs>
    //   </div>
    //   {tradeView === "chart" ? <ChartView /> : <></>}
    // </div>
  );
};

export default TradeWrapper;
