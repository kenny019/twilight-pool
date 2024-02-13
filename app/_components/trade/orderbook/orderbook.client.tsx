import { Tabs, TabsList, TabsTrigger } from "@/components/tabs";
import React, { useState } from "react";
import { OrderBookDataTable } from "./data-table";
import { orderAsks, orderbookColumns } from "./columns";
import OrderbookSplitIcon from "@/components/icons/orderbook-split";
import OrderbookBidsIcon from "@/components/icons/orderbook-bids";
import OrderbookAsksIcon from "@/components/icons/orderbook-asks";
import {
  DropdownContent,
  DropdownGroup,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
} from "@/components/dropdown";
import { ChevronDown } from "lucide-react";
import cn from "@/lib/cn";
import OrderMyTrades from "./my-trades.client";

type OrderbookTabs = "market" | "trades";
type OrderbookLayout = "split" | "asks" | "bids";

const Orderbook = () => {
  const [currentTab, setCurrentTab] = useState<OrderbookTabs>("market");
  const [orderbookLayout, setOrderbookLayout] =
    useState<OrderbookLayout>("split");

  const [currentOrderbookPage, setCurrentOrderbookPage] = useState(1);

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
              <DropdownMenu>
                <DropdownTrigger asChild>
                  <button className="group ml-4 flex items-center gap-1 text-sm">
                    {currentOrderbookPage}
                    <ChevronDown className="h-3 w-3 transition-all group-data-[state=open]:-rotate-180" />
                  </button>
                </DropdownTrigger>
                <DropdownContent className="mt-2 min-w-[48px] before:mt-[7px]">
                  <DropdownGroup>
                    {Array(5)
                      .fill(0)
                      .map((_, index) => (
                        <DropdownItem
                          key={index}
                          className={cn(
                            index + 1 === currentOrderbookPage && "text-theme",
                            "flex justify-center hover:bg-primary hover:text-button-secondary"
                          )}
                          onClick={() => setCurrentOrderbookPage(index + 1)}
                        >
                          {index + 1}
                        </DropdownItem>
                      ))}
                  </DropdownGroup>
                </DropdownContent>
              </DropdownMenu>
            </div>
            <div>
              <OrderbookLayouts />
            </div>
          </>
        );
      }
      case "trades": {
        return <OrderMyTrades />;
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
