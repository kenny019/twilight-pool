"use client";
import React, { useRef } from "react";
import { Responsive, WidthProvider } from "react-grid-layout";
import useWindow from "@/lib/hooks/useWindow";
import Order from "./order/order.client";
import Orderbook from "./orderbook/orderbook.client";
import Chart from "./chart/chart.client";
import { usePriceFeed } from "@/lib/providers/feed";
import DragWrapper from "./drag-wrapper.client";
import {
  GRID_HEIGHT_OFFSET,
  GRID_ROW_HEIGHT,
  GRID_WIDTH_OFFSET,
} from "@/lib/constants";

const layout = [
  { i: "order", x: 10, y: 0, w: 2, h: 11, minW: 2, minH: 11 },
  { i: "chart", x: 2, y: 0, w: 8, h: 11, minW: 2, minH: 8 },
  { i: "orderbook", x: 0, y: 0, w: 2, h: 11, minW: 2 },
];

const ResponsiveGridLayout = WidthProvider(Responsive);

function calculateGridDimensions(
  gridWidth: number,
  gridHeight: number,
  windowWidth: number
) {
  return {
    width: gridWidth * Math.floor(windowWidth / 12) - GRID_WIDTH_OFFSET,
    height: gridHeight * GRID_ROW_HEIGHT + GRID_HEIGHT_OFFSET,
  };
}

const TradeWrapper = () => {
  const gridDimensionRefs = useRef(
    layout.map((layoutVal) => {
      const gridDimensions = calculateGridDimensions(
        layoutVal.w,
        layoutVal.h,
        1366
      );
      return {
        name: layoutVal.i,
        width: gridDimensions.width,
        height: gridDimensions.height,
      };
    })
  );

  return (
    <ResponsiveGridLayout
      layouts={{ lg: layout }}
      cols={{ lg: 12, md: 12, sm: 8, xs: 4, xxs: 4 }}
      rowHeight={GRID_ROW_HEIGHT}
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

        const gridDimensions = calculateGridDimensions(
          newItem.w,
          newItem.h,
          1366
        );

        gridDimensionRefs.current[gridRefToUpdate] = {
          ...gridDimensionRefs.current[gridRefToUpdate],
          width: gridDimensions.width,
          height: gridDimensions.height,
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
