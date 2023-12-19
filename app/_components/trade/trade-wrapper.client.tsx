"use client";
import React, { createRef, useRef } from "react";
import { Responsive as ResponsiveGridLayout } from "react-grid-layout";
import useWindow from "@/lib/hooks/useWindow";
import Order from "./order/order.client";
import Orderbook from "./orderbook/orderbook.client";
import Chart from "./chart/chart.client";
import { usePriceFeed } from "@/lib/providers/feed";
import DragWrapper from "./drag-wrapper.client";

const layout = [
  { i: "order", x: 10, y: 0, w: 2, h: 11, minW: 2, minH: 11 },
  { i: "chart", x: 2, y: 0, w: 8, h: 11, minW: 2 },
  { i: "orderbook", x: 0, y: 0, w: 2, h: 11, minW: 2 },
];

const marginH = 16; // refactor
const gridOffsetY = 44;

const TradeWrapper = () => {
  const { width: windowWidth } = useWindow();
  const { feed } = usePriceFeed();

  const gridDimensionRefs = useRef(
    layout.map((layoutVal) => {
      return {
        name: layoutVal.i,
        width: layoutVal.w * Math.floor(Math.floor(windowWidth) / 12) - 24,
        height: layoutVal.h * 30 + 24,
      };
    })
  );

  return (
    <ResponsiveGridLayout
      layouts={{ lg: layout }}
      cols={{ lg: 12, md: 12, sm: 8, xs: 4, xxs: 4 }}
      rowHeight={30}
      width={windowWidth}
      draggableHandle=".draggable"
      onResizeStart={() => {
        const widgets = document.querySelectorAll(".react-grid-item");
        widgets.forEach((widget) => {
          if (!widget.classList.contains("noselect"))
            widget.classList.add("noselect");
        });
      }}
      onResizeStop={(_layout, _oldItem, newItem) => {
        const gridRefToUpdate = layout.reduce((acc, item, index) => {
          if (item.i !== newItem.i) {
            return acc;
          }
          acc = index;
          return acc;
        }, 0);

        gridDimensionRefs.current[gridRefToUpdate] = {
          ...gridDimensionRefs.current[gridRefToUpdate],
          width: newItem.w * Math.floor(Math.floor(windowWidth) / 12) - 24,
          height: newItem.h * 30 + 24,
        };

        // hack to force the grid to disable selection
        const widgets = document.querySelectorAll(".react-grid-item");
        widgets.forEach((widget) => {
          if (widget.classList.contains("noselect"))
            widget.classList.remove("noselect");
        });
      }}
    >
      <DragWrapper
        dimension={gridDimensionRefs.current}
        name="order"
        title="Orders"
        key="order"
      >
        <Order />
      </DragWrapper>
      <DragWrapper
        dimension={gridDimensionRefs.current}
        name="chart"
        title="Chart"
        key="chart"
      >
        <Chart />
      </DragWrapper>
      <DragWrapper
        dimension={gridDimensionRefs.current}
        name="orderbook"
        title="Orderbook"
        key="orderbook"
      >
        <Orderbook />
      </DragWrapper>
    </ResponsiveGridLayout>
  );
};

export default TradeWrapper;
