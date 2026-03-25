"use client";
import React, { useEffect, useRef, useState } from "react";
import useWindow from "@/lib/hooks/useWindow";
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
import Button from "@/components/button";

const TOP_ROW_H = 14;
const MIN_DETAILS_H = 4;
const GRID_MARGIN = 10; // react-grid-layout default margin
const ROW_UNIT = GRID_ROW_HEIGHT + GRID_MARGIN; // actual px per grid row (30 + 10)

function makeDesktopLayoutWithTrades(detailsH: number) {
  return [
    { i: "order", x: 10, y: 0, w: 3, h: TOP_ROW_H, minW: 2, minH: 12 },
    { i: "chart", x: 0, y: 0, w: 7, h: TOP_ROW_H, minW: 2, minH: 8 },
    { i: "orderbook", x: 7, y: 0, w: 2, h: TOP_ROW_H, minW: 2 },
    { i: "details", x: 0, y: TOP_ROW_H, w: 12, h: detailsH, minW: 4, minH: MIN_DETAILS_H },
  ];
}

function makeDesktopLayoutWithoutTrades(detailsH: number) {
  return [
    { i: "order", x: 9, y: 0, w: 3, h: TOP_ROW_H, minW: 2, minH: 12 },
    { i: "chart", x: 0, y: 0, w: 9, h: TOP_ROW_H, minW: 2, minH: 8 },
    { i: "details", x: 0, y: TOP_ROW_H, w: 12, h: detailsH, minW: 4, minH: MIN_DETAILS_H },
  ];
}

const layoutSmall = [
  { i: "chart", x: 0, y: 0, w: 4, h: 11, minW: 2, minH: 8 },
  { i: "order", x: 0, y: 11, w: 4, h: 15, minW: 2, minH: 12 },
  { i: "details", x: 0, y: 26, w: 4, h: 20, minW: 4, minH: 4 },
];

const TRADES_PANEL_STORAGE_KEY = "twilight-trades-panel-visible";

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
  const [isTradesPanelVisible, setIsTradesPanelVisible] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(TRADES_PANEL_STORAGE_KEY) === "true";
  });
  const { width: windowWidth, height: windowHeight } = useWindow();
  const gridContainerRef = useRef<HTMLDivElement>(null);
  const [gridTop, setGridTop] = useState<number | null>(null);

  // Measure the grid's fixed offset from the top of the page (scroll-independent)
  useEffect(() => {
    if (!gridContainerRef.current) return;
    let top = 0;
    let el: HTMLElement | null = gridContainerRef.current;
    while (el) {
      top += el.offsetTop;
      el = el.offsetParent as HTMLElement | null;
    }
    setGridTop(top);
  }, [hasMounted]);

  const showOrderbook = windowWidth >= 996;

  // On desktop, compute details height to fill remaining viewport.
  // gridTop includes navbar + ticker. The top row occupies
  // TOP_ROW_H * ROW_UNIT + GRID_MARGIN (container padding) pixels.
  const topRowPixels = TOP_ROW_H * ROW_UNIT + GRID_MARGIN;
  const detailsH =
    showOrderbook && gridTop !== null
      ? Math.max(
          MIN_DETAILS_H,
          Math.floor((windowHeight - gridTop - topRowPixels) / ROW_UNIT)
        )
      : MIN_DETAILS_H + 4; // fallback before measurement

  const activeDesktopLayout =
    showOrderbook && isTradesPanelVisible
      ? makeDesktopLayoutWithTrades(detailsH)
      : makeDesktopLayoutWithoutTrades(detailsH);
  const activeGridLayout = showOrderbook ? activeDesktopLayout : layoutSmall;

  const setPrice = useSessionStore((state) => state.price.setPrice);
  const { data: candleData } = useCandleData(CandleInterval.ONE_MINUTE);

  const priceInitRef = useRef(false);
  useEffect(() => {
    if (!candleData || candleData.length === 0 || priceInitRef.current) return;
    priceInitRef.current = true;
    setPrice(parseFloat(candleData[candleData.length - 1].close) || 0);
  }, [candleData, setPrice]);

  const [dimensionOverrides, setDimensionOverrides] = useState<
    Record<string, { width: number; height: number }>
  >({});

  const gridDimensions = activeGridLayout.map((layoutVal) => {
    const calculatedDimensions = calculateGridDimensions(
      layoutVal.w,
      layoutVal.h,
      1366
    );
    const override = dimensionOverrides[layoutVal.i];

    return {
      name: layoutVal.i,
      width: override?.width ?? calculatedDimensions.width,
      height: override?.height ?? calculatedDimensions.height,
    };
  });

  useEffect(() => {
    setHasMounted(true);
  }, []);

  function setTradesPanelVisibility(nextValue: boolean) {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(TRADES_PANEL_STORAGE_KEY, String(nextValue));
    }
    setIsTradesPanelVisible(nextValue);
  }

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
    <div ref={gridContainerRef} className="pb-20 lg:pb-[140px]">
      <ResponsiveGridLayout
        layouts={{ lg: activeDesktopLayout, sm: layoutSmall }}
        cols={{ lg: 12, md: 12, sm: 4, xs: 4, xxs: 4 }}
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
          const gridDimensions = calculateGridDimensions(
            newItem.w,
            newItem.h,
            1366
          );

          setDimensionOverrides((prev) => ({
            ...prev,
            [newItem.i]: {
              width: gridDimensions.width,
              height: gridDimensions.height,
            },
          }));

          // hack to force the grid to disable selection
          const widgets = document.querySelectorAll(".react-grid-item");
          widgets.forEach((widget) => {
            if (widget.classList.contains("noselect"))
              widget.classList.remove("noselect");
          });
        }}
      >
        <DragWrapper
          dimension={gridDimensions}
          name="order"
          title="Orders"
          key="order"
          id="order"
        >
          <Order />
        </DragWrapper>
        <DragWrapper
          dimension={gridDimensions}
          name="chart"
          title={
            <div className="flex items-center justify-between gap-2">
              <span>Chart</span>
              {showOrderbook && !isTradesPanelVisible && (
                <Button
                  variant="ui"
                  size="small"
                  className="h-6 px-2 text-[10px]"
                  onMouseDown={(event) => event.stopPropagation()}
                  onClick={(event) => {
                    event.stopPropagation();
                    setTradesPanelVisibility(true);
                  }}
                >
                  Show Trades
                </Button>
              )}
            </div>
          }
          key="chart"
          id="chart"
        >
          <KLineChart />
        </DragWrapper>
        {showOrderbook && isTradesPanelVisible && (
          <DragWrapper
            dimension={gridDimensions}
            name="orderbook"
            title={
              <div className="flex items-center justify-between gap-2">
                <span>Trades</span>
                <Button
                  variant="ui"
                  size="small"
                  className="h-6 px-2 text-[10px]"
                  onMouseDown={(event) => event.stopPropagation()}
                  onClick={(event) => {
                    event.stopPropagation();
                    setTradesPanelVisibility(false);
                  }}
                >
                  Hide
                </Button>
              </div>
            }
            key="orderbook"
            id="orderbook"
          >
            <Orderbook />
          </DragWrapper>
        )}
        <DragWrapper
          dimension={gridDimensions}
          name="details"
          title="Details"
          key="details"
          id="details"
        >
          <DetailsPanel />
        </DragWrapper>
      </ResponsiveGridLayout>
    </div>
  );
};

export default TradeWrapper;
