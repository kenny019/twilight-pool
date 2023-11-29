import { Tabs, TabsList, TabsTrigger } from "@/components/tabs";
import React, { useState } from "react";
import { OrderBookDataTable } from "./data-table";
import { orderAsks, orderbookColumns } from "./columns";

type OrderbookTabs = "market" | "mine";

const Orderbook = () => {
  const [currentTab, setCurrentTab] = useState<OrderbookTabs>("market");

  function OrderbookViews() {
    switch (currentTab) {
      case "market": {
        return (
          <div>
            <OrderBookDataTable
              columns={orderbookColumns}
              data={orderAsks}
              type="asks"
            />
            <OrderBookDataTable
              columns={orderbookColumns}
              data={orderAsks}
              type="bids"
            />
          </div>
        );
      }
      case "mine": {
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
              onClick={() => setCurrentTab("mine")}
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
