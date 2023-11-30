import { Tabs, TabsList, TabsTrigger } from "@/components/tabs";
import React, { useState } from "react";
import { OrderBookDataTable } from "./data-table";
import { orderAsks, orderbookColumns } from "./columns";
import OrderbookSplitIcon from "@/components/icons/orderbook-split";
import OrderbookBidsIcon from "@/components/icons/orderbook-bids";
import OrderbookAsksIcon from "@/components/icons/orderbook-asks";
import Button from "@/components/button";

type OrderbookTabs = "market" | "trades";
type OrderbookLayout = "split" | "asks" | "bids";

const Orderbook = () => {
  const [currentTab, setCurrentTab] = useState<OrderbookTabs>("market");
  const [orderbookLayout, setOrderbookLayout] =
    useState<OrderbookLayout>("split");

  function OrderbookLayouts() {
    switch (orderbookLayout) {
      case "split": {
        return (
          <>
            <OrderBookDataTable
              columns={orderbookColumns}
              data={orderAsks}
              type="asks"
              header
            />
            <OrderBookDataTable
              columns={orderbookColumns}
              data={orderAsks}
              type="bids"
            />
          </>
        );
      }
      case "asks": {
        return (
          <OrderBookDataTable
            columns={orderbookColumns}
            data={orderAsks}
            type="asks"
            header
          />
        );
      }
      case "bids": {
        return (
          <OrderBookDataTable
            columns={orderbookColumns}
            data={orderAsks}
            type="bids"
            header
          />
        );
      }
    }
  }

  function OrderbookViews() {
    switch (currentTab) {
      case "market": {
        return (
          <>
            <div className="flex w-full justify-between border-b px-3 pb-2">
              <div className="flex space-x-1">
                <OrderbookSplitIcon
                  data-state={orderbookLayout === "split" && "selected"}
                  onClick={() => setOrderbookLayout("split")}
                />
                <OrderbookBidsIcon
                  data-state={orderbookLayout === "bids" && "selected"}
                  onClick={() => setOrderbookLayout("bids")}
                />
                <OrderbookAsksIcon
                  data-state={orderbookLayout === "asks" && "selected"}
                  onClick={() => setOrderbookLayout("asks")}
                />
              </div>
              1 {/* to replace with pagination dropdown */}
            </div>
            <div>
              <OrderbookLayouts />
            </div>
          </>
        );
      }
      case "trades": {
        return <div></div>;
      }
    }
  }

  return (
    <div className="w-full space-y-2 py-2">
      <div className="flex w-full items-center border-b pl-3">
        <Tabs defaultValue={currentTab}>
          <TabsList variant="underline">
            <TabsTrigger
              onClick={() => setCurrentTab("market")}
              value={"market"}
              variant="underline"
            >
              Market
            </TabsTrigger>
            <TabsTrigger
              onClick={() => setCurrentTab("trades")}
              value={"mine"}
              variant="underline"
            >
              My Trades
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <OrderbookViews />
    </div>
  );
};

export default Orderbook;
