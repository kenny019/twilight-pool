"use client";
import React, { useEffect, useRef, useState } from "react";
import useWindowWidth from "@/lib/hooks/useWindowWidth";
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
import { ChevronDown, X } from "lucide-react";
import cn from "@/lib/cn";
import OrderRecentTrades from "./orderbook/recent-trades.client";

const TOP_ROW_H = 14;
const MIN_DETAILS_H = 8;
const GRID_MARGIN = 10; // react-grid-layout default margin
const ROW_UNIT = GRID_ROW_HEIGHT + GRID_MARGIN; // actual px per grid row (30 + 10)

function makeDesktopLayoutWithTrades(detailsH: number) {
  return [
    { i: "order", x: 10, y: 0, w: 3, h: TOP_ROW_H, minW: 2, minH: 12 },
    { i: "chart", x: 0, y: 0, w: 7, h: TOP_ROW_H, minW: 2, minH: 8 },
    { i: "orderbook", x: 7, y: 0, w: 2, h: TOP_ROW_H, minW: 2 },
    {
      i: "details",
      x: 0,
      y: TOP_ROW_H,
      w: 12,
      h: detailsH,
      minW: 4,
      minH: MIN_DETAILS_H,
    },
  ];
}

function makeDesktopLayoutWithoutTrades(detailsH: number) {
  return [
    { i: "order", x: 9, y: 0, w: 3, h: TOP_ROW_H, minW: 2, minH: 12 },
    { i: "chart", x: 0, y: 0, w: 9, h: TOP_ROW_H, minW: 2, minH: 8 },
    {
      i: "details",
      x: 0,
      y: TOP_ROW_H,
      w: 12,
      h: detailsH,
      minW: 4,
      minH: MIN_DETAILS_H,
    },
  ];
}

const layoutSmall = [
  { i: "chart", x: 0, y: 0, w: 4, h: 11, minW: 2, minH: 8 },
  { i: "order", x: 0, y: 11, w: 4, h: 15, minW: 2, minH: 12 },
  { i: "details", x: 0, y: 26, w: 4, h: 10, minW: 4, minH: 4 },
];

const layoutMedium = [
  { i: "chart", x: 0, y: 0, w: 12, h: 11, minW: 4, minH: 8 },
  { i: "order", x: 0, y: 11, w: 12, h: 15, minW: 4, minH: 12 },
  { i: "details", x: 0, y: 26, w: 12, h: 14, minW: 4, minH: 4 },
];

const layoutMediumWithTrades = [
  { i: "chart", x: 0, y: 0, w: 12, h: 8, minW: 4, minH: 6 },
  { i: "orderbook", x: 0, y: 8, w: 12, h: 6, minW: 4 },
  { i: "order", x: 0, y: 14, w: 12, h: 15, minW: 4, minH: 12 },
  { i: "details", x: 0, y: 29, w: 12, h: 14, minW: 4, minH: 4 },
];

/** Strip the "details" item from a grid layout (mobile renders it outside the grid). */
function withoutDetailsItem<T extends { i: string }>(layout: T[]): T[] {
  return layout.filter((item) => item.i !== "details");
}

/** Strip the "order" item from a grid layout (mobile renders it outside the grid). */
function withoutOrderItem<T extends { i: string }>(layout: T[]): T[] {
  return layout.filter((item) => item.i !== "order");
}

const TRADES_PANEL_STORAGE_KEY = "twilight-trades-panel-visible";
const MOBILE_TRADES_STORAGE_KEY = "twilight-mobile-trades-visible";

const ResponsiveGridLayout = WidthProvider(Responsive);

function calculateGridDimensions(
  gridWidth: number,
  gridHeight: number,
  availableWidth: number,
  totalCols: number
) {
  return {
    width:
      gridWidth * Math.floor(availableWidth / totalCols) - GRID_WIDTH_OFFSET,
    height: gridHeight * GRID_ROW_HEIGHT + GRID_HEIGHT_OFFSET,
  };
}

const TradeWrapper = () => {
  const [hasMounted, setHasMounted] = useState(false);
  const [isTradesPanelVisible, setIsTradesPanelVisible] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(TRADES_PANEL_STORAGE_KEY) === "true";
  });
  const [isMobileTradesVisible, setIsMobileTradesVisible] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(MOBILE_TRADES_STORAGE_KEY) === "true";
  });
  const windowWidth = useWindowWidth();

  // Track window height for desktop detailsH only.
  // The 996px guard means this never fires on mobile (keyboard appearance
  // changes innerHeight on mobile but NOT on desktop), so the soft keyboard
  // cannot trigger a re-render of this component and dismiss the focused input.
  const [windowHeight, setWindowHeight] = useState(0);
  useEffect(() => {
    function updateHeight() {
      if (window.innerWidth >= 996) {
        setWindowHeight(window.innerHeight);
      }
    }
    if (typeof window === "undefined") return;
    updateHeight();
    window.addEventListener("resize", updateHeight);
    return () => window.removeEventListener("resize", updateHeight);
  }, []);
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
  const isTablet = windowWidth >= 768 && windowWidth < 996;
  const isMobile = !showOrderbook;
  const isPhone = isMobile && !isTablet;

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
      : MIN_DETAILS_H; // fallback before measurement

  const activeDesktopLayout =
    showOrderbook && isTradesPanelVisible
      ? makeDesktopLayoutWithTrades(detailsH)
      : makeDesktopLayoutWithoutTrades(detailsH);
  const activeDesktopGridLayout = withoutDetailsItem(activeDesktopLayout);
  // On mobile, both the details panel and order form are rendered outside the grid
  // for natural page scroll and natural content height (no dead space).
  const activeCompactLayout = withoutDetailsItem(
    withoutOrderItem(
      windowWidth >= 768
        ? isTradesPanelVisible
          ? layoutMediumWithTrades
          : layoutMedium
        : layoutSmall
    )
  );
  const activeGridLayout = showOrderbook
    ? activeDesktopGridLayout
    : activeCompactLayout;
  const activeGridCols = showOrderbook ? 12 : windowWidth >= 768 ? 12 : 4;
  const availableGridWidth =
    gridContainerRef.current?.clientWidth || windowWidth;

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
      availableGridWidth,
      activeGridCols
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

  function setMobileTradesVisibility(nextValue: boolean) {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(MOBILE_TRADES_STORAGE_KEY, String(nextValue));
    }
    setIsMobileTradesVisible(nextValue);
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
    <div ref={gridContainerRef}>
      <ResponsiveGridLayout
        layouts={{
          lg: activeDesktopGridLayout,
          md: withoutDetailsItem(
            withoutOrderItem(
              isTradesPanelVisible ? layoutMediumWithTrades : layoutMedium
            )
          ),
          sm: withoutDetailsItem(withoutOrderItem(layoutSmall)),
          xs: withoutDetailsItem(withoutOrderItem(layoutSmall)),
          xxs: withoutDetailsItem(withoutOrderItem(layoutSmall)),
        }}
        breakpoints={{ lg: 996, md: 768, sm: 480, xs: 320, xxs: 0 }}
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
            availableGridWidth,
            activeGridCols
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
        {!isMobile && (
          <DragWrapper
            dimension={gridDimensions}
            name="order"
            title="Orders"
            key="order"
            id="order"
            isMobile={false}
          >
            <Order />
          </DragWrapper>
        )}
        <DragWrapper
          dimension={gridDimensions}
          name="chart"
          isMobile={isMobile}
          mobileClassName="h-[40svh] min-h-[280px] max-h-[420px]"
          title="Chart"
          key="chart"
          id="chart"
        >
          <KLineChart
            onShowTrades={
              (showOrderbook || isTablet) && !isTradesPanelVisible
                ? () => setTradesPanelVisibility(true)
                : undefined
            }
          />
        </DragWrapper>
        {(showOrderbook || isTablet) && isTradesPanelVisible && (
          <DragWrapper
            dimension={gridDimensions}
            name="orderbook"
            title={
              <div className="flex items-center justify-between gap-2">
                <span>Trades</span>
                <button
                  className="rounded p-0.5 text-primary/40 transition-colors hover:text-primary/80"
                  title="Hide Trades"
                  onMouseDown={(event) => event.stopPropagation()}
                  onClick={(event) => {
                    event.stopPropagation();
                    setTradesPanelVisibility(false);
                  }}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            }
            key="orderbook"
            id="orderbook"
          >
            <Orderbook />
          </DragWrapper>
        )}
      </ResponsiveGridLayout>
      {isPhone && (
        <div className="-mt-1.5 px-[10px]">
          <div className="border-border/60 overflow-hidden rounded-md border bg-background">
            <button
              className={cn(
                "flex w-full items-center justify-between px-3 py-1.5",
                isMobileTradesVisible && "border-border/60 border-b"
              )}
              onClick={() => setMobileTradesVisibility(!isMobileTradesVisible)}
            >
              <span className="text-muted-foreground text-xs font-medium">
                Recent Trades
              </span>
              <ChevronDown
                className={cn(
                  "text-muted-foreground/60 h-3.5 w-3.5 transition-transform duration-200",
                  isMobileTradesVisible && "rotate-180"
                )}
              />
            </button>
            {isMobileTradesVisible && (
              <div
                className="max-h-52 overflow-y-auto [&::-webkit-scrollbar]:hidden"
                style={{ scrollbarWidth: "none" }}
              >
                <OrderRecentTrades />
              </div>
            )}
          </div>
        </div>
      )}
      {isMobile && (
        <div className={cn(isPhone ? "mt-2.5" : "-mt-1.5", "px-[10px]")}>
          <div className="border-border/60 overflow-hidden rounded-md border bg-background">
            <Order />
          </div>
        </div>
      )}
      <div className="mt-2.5 px-[10px] pb-20 md:pb-24">
        <div className="border-border/60 overflow-hidden rounded-md border bg-background">
          <div className="border-border/60 text-muted-foreground min-h-[30px] border-b px-3 py-1.5 text-xs font-medium">
            Trading Activity
          </div>
          <DetailsPanel />
        </div>
      </div>
    </div>
  );
};

export default TradeWrapper;
