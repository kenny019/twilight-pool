"use client";
import React from "react";
import { Responsive as ResponsiveGridLayout } from "react-grid-layout";
import useWindow from "@/lib/hooks/useWindow";
import Order from "./order/order.client";

function DragWrapper({
  title,
  children,
}: {
  title?: string;
  children?: React.ReactNode;
}) {
  return (
    <>
      <div className="draggable min-h-[38px] w-full cursor-grab border-b py-2 pl-3 text-sm active:cursor-grabbing">
        {title}
      </div>
      {children}
    </>
  );
}
const layout = [
  { i: "order", x: 0, y: 0, w: 2, h: 10 },
  { i: "chart", x: 2, y: 0, w: 8, h: 10 },
  { i: "orderbook", x: 10, y: 0, w: 2, h: 10 },
];

const TradeWrapper = () => {
  const { width: windowWidth } = useWindow();

  console.log(windowWidth);
  return (
    <ResponsiveGridLayout
      layouts={{ lg: layout }}
      cols={{ lg: 12, md: 12, sm: 8, xxs: 4 }}
      rowHeight={30}
      width={windowWidth - 12}
      draggableHandle=".draggable"
      className="overflow-hidden"
    >
      <div className="border bg-background" key="order">
        <DragWrapper title="Orders">
          <Order />
        </DragWrapper>
      </div>
      <div className="border bg-background" key="chart">
        <DragWrapper title="Chart" />
      </div>
      <div className="border bg-background" key="orderbook">
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
