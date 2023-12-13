"use client";
import React from "react";
import { Responsive as ResponsiveGridLayout } from "react-grid-layout";
import useWindow from "@/lib/hooks/useWindow";
import Order from "./order/order.client";
import Orderbook from "./orderbook/orderbook.client";
import Chart from "./chart/chart.client";
import { usePriceFeed } from "@/lib/providers/feed";
import DragWrapper from "./drag-wrapper.client";

const layout = [
  { i: "order", x: 10, y: 0, w: 2, h: 10, minW: 2 },
  { i: "chart", x: 2, y: 0, w: 8, h: 10, minW: 2 },
  { i: "orderbook", x: 0, y: 0, w: 2, h: 10, minW: 2 },
];

const TradeWrapper = () => {
  const { width: windowWidth } = useWindow();
  const { feed } = usePriceFeed();

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
      <DragWrapper title="Orders" key="order">
        <Order />
      </DragWrapper>
      <DragWrapper title="Chart" key="chart">
        <Chart />
      </DragWrapper>
      <DragWrapper title="Orderbook" key="orderbook">
        <Orderbook />
      </DragWrapper>
    </ResponsiveGridLayout>
  );
};

export default TradeWrapper;
