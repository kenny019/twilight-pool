"use client";
import React from "react";
import { Responsive as ResponsiveGridLayout } from "react-grid-layout";
import useWindow from "@/lib/hooks/useWindow";
import Order from "./order/order.client";
import Orderbook from "./orderbook/orderbook.client";

function DragWrapper({
  title,
  children,
}: {
  title?: string;
  children?: React.ReactNode;
}) {
  return (
    <>
      <div className="draggable min-h-[38px] w-full cursor-grab select-none border-b py-2 pl-3 text-sm active:cursor-grabbing">
        {title}
      </div>
      {children}
    </>
  );
}
const layout = [
  { i: "order", x: 10, y: 0, w: 2, h: 10, minW: 2 },
  { i: "chart", x: 2, y: 0, w: 8, h: 10, minW: 2 },
  { i: "orderbook", x: 0, y: 0, w: 2, h: 10, minW: 2 },
];

const TradeWrapper = () => {
  const { width: windowWidth } = useWindow();

  return (
    <ResponsiveGridLayout
      layouts={{ lg: layout }}
      cols={{ lg: 12, md: 12, sm: 8, xs: 4, xxs: 4 }}
      rowHeight={30}
      width={windowWidth - 8}
      draggableHandle=".draggable"
      className="overflow-hidden"
      onResizeStart={() => {
        const widgets = document.querySelectorAll(".react-grid-item");
        widgets.forEach((widget) => {
          if (!widget.classList.contains("noselect"))
            widget.classList.add("noselect");
        });
      }}
      onResizeStop={() => {
        const widgets = document.querySelectorAll(".react-grid-item");
        widgets.forEach((widget) => {
          if (widget.classList.contains("noselect"))
            widget.classList.remove("noselect");
        });
      }}
    >
      <div className="rounded-md border bg-background" key="order">
        <DragWrapper title="Orders">
          <Order />
        </DragWrapper>
      </div>
      <div className="rounded-md border bg-background" key="chart">
        <DragWrapper title="Chart" />
      </div>
      <div className="rounded-md border bg-background" key="orderbook">
        <DragWrapper title="Orderbook">
          <Orderbook />
        </DragWrapper>
      </div>
    </ResponsiveGridLayout>
  );
};

export default TradeWrapper;
