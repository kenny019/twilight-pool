"use client";
import { Tabs, TabsList, TabsTrigger } from "@/components/tabs";
import React, { useState } from "react";
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
import OrderRecentTrades from "./recent-trades.client";
import { OrderbookLayouts } from "./limit-layout";

type OrderbookTabs = "market" | "trades" | "recent";
type OrderbookLayout = "split" | "asks" | "bids";

const Orderbook = () => {
  const [currentTab, setCurrentTab] = useState<OrderbookTabs>("market");
  const [orderbookLayout, setOrderbookLayout] =
    useState<OrderbookLayout>("split");

  const [currentOrderbookPage, setCurrentOrderbookPage] = useState(1);

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
                    {Array(1)
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
              <OrderbookLayouts layouts={orderbookLayout} />
            </div>
          </>
        );
      }
      case "trades": {
        return <OrderMyTrades />;
      }
      case "recent": {
        return <OrderRecentTrades />;
      }
    }
  }

  return (
    <div className="flex h-full w-full flex-col space-y-2 overflow-auto py-2">
      <div className="flex w-full items-center border-b pl-3">
        <Tabs defaultValue={currentTab}>
          <TabsList className="flex w-full border-b-0" variant="underline">
            <TabsTrigger
              onClick={() => setCurrentTab("market")}
              value={"market"}
              variant="underline"
            >
              Market
            </TabsTrigger>
            <TabsTrigger
              onClick={() => setCurrentTab("recent")}
              value={"recent"}
              variant="underline"
            >
              Recent
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
