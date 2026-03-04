"use client";
import React, { useEffect, useRef, useState } from "react";
import { Responsive, WidthProvider } from "react-grid-layout";
import Order from "./order/order.client";
import Orderbook from "./orderbook/orderbook.client";
import DragWrapper from "./drag-wrapper.client";
import {
  GRID_HEIGHT_OFFSET,
  GRID_ROW_HEIGHT,
  GRID_WIDTH_OFFSET,
} from "@/lib/constants";
import KLineChart from "./chart/kline-chart.client";
import DetailsPanel from "./details/details.client";
import Skeleton from "@/components/skeleton";
import { CandleInterval } from "@/lib/types";
import { useCandleData } from "@/lib/hooks/useCandleData";
import { useSessionStore } from "@/lib/providers/session";

const layout = [
  { i: "order", x: 10, y: 0, w: 3, h: 14, minW: 2, minH: 12 },
  { i: "chart", x: 0, y: 0, w: 7, h: 14, minW: 2, minH: 8 },
  { i: "orderbook", x: 7, y: 0, w: 2, h: 14, minW: 2 },
  { i: "details", x: 0, y: 14, w: 12, h: 8, minW: 4, minH: 4 },
];

const layoutSmall = [
  { i: "order", x: 0, y: 11, w: 2, h: 12, minW: 2, minH: 12 },
  { i: "chart", x: 0, y: 0, w: 4, h: 11, minW: 2, minH: 8 },
  { i: "orderbook", x: 2, y: 11, w: 2, h: 11, minW: 2 },
  { i: "details", x: 0, y: 22, w: 4, h: 5, minW: 4, minH: 4 },
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
  const [hasMounted, setHasMounted] = useState(false);

  const setPrice = useSessionStore((state) => state.price.setPrice);
  const { data: candleData } = useCandleData(CandleInterval.ONE_MINUTE);

  const priceInitRef = useRef(false);
  useEffect(() => {
    if (!candleData || candleData.length === 0 || priceInitRef.current) return;
    priceInitRef.current = true;
    setPrice(parseFloat(candleData[candleData.length - 1].close) || 0);
  }, [candleData, setPrice]);

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

  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) {
    return (
      <div className="grid h-full w-full grid-cols-4 gap-4 p-4 md:grid-cols-12">
        <Skeleton className="col-span-4 h-[430px] w-full md:col-span-2" />
        <Skeleton className="col-span-2 h-[430px] w-full md:col-span-8" />
        <Skeleton className="col-span-2 h-[430px] w-full" />
        <Skeleton className="col-span-4 h-[190px] w-full md:col-span-12" />
      </div>
    );
  }

  return (
    <ResponsiveGridLayout
      layouts={{ lg: layout, sm: layoutSmall }}
      cols={{ lg: 12, md: 12, sm: 4, xs: 4, xxs: 4 }}
      rowHeight={GRID_ROW_HEIGHT}
      className="pb-4"
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
        id="order"
      >
        <Order />
      </DragWrapper>
      <DragWrapper
        dimension={gridDimensionRefs.current}
        name="chart"
        title="Chart"
        key="chart"
        id="chart"
      >
        <KLineChart />
      </DragWrapper>
      <DragWrapper
        dimension={gridDimensionRefs.current}
        name="orderbook"
        title="Trades"
        key="orderbook"
        id="orderbook"
      >
        <Orderbook />
      </DragWrapper>
      <DragWrapper
        dimension={gridDimensionRefs.current}
        name="details"
        title="Details"
        key="details"
        id="details"
      >
        <DetailsPanel />
      </DragWrapper>
    </ResponsiveGridLayout>
  );
};

export default TradeWrapper;
