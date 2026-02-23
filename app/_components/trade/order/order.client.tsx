import { Tabs, TabsList, TabsTrigger } from "@/components/tabs";
import { ArrowLeftRight, ChevronDown } from "lucide-react";
import React, { useState } from "react";
import {
  DropdownContent,
  DropdownGroup,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
} from "@/components/dropdown";
import OrderLimitForm from "./forms/limit.client";
import OrderMarketForm from "./forms/market.client";
import Button from "@/components/button";
import FundingTradeButton from "@/components/fund-trade-button";

type OrderTabs = "limit" | "market";

const Order = () => {
  const [currentTab, setCurrentTab] = useState<OrderTabs>("market");

  function OrderViews() {
    switch (currentTab) {
      case "limit": {
        // todo: extract into seperate form file
        return <OrderLimitForm />;
      }
      case "market": {
        return <OrderMarketForm />;
      }
    }
  }

  return (
    <div className="space-y-2 py-2">
      <div className="relative flex w-full items-center justify-between border-b pl-3">
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
              onClick={() => setCurrentTab("limit")}
              value={"limit"}
              variant="underline"
            >
              Limit
            </TabsTrigger>
            {/* note this should actually be a button with dropdown */}
          </TabsList>
        </Tabs>
        {/* <DropdownMenu>
          <DropdownTrigger asChild>
            <button className="group ml-4 flex items-center gap-1 text-sm">
              Stop
              <ChevronDown className="h-3 w-3 transition-all group-data-[state=open]:-rotate-180" />
            </button>
          </DropdownTrigger>
          <DropdownContent className="mt-2 before:mt-[7px]">
            <DropdownGroup>
              <DropdownItem className="hover:bg-primary hover:text-button-secondary">
                Stop Limit
              </DropdownItem>
              <DropdownItem className="hover:bg-primary hover:text-button-secondary">
                Stop Market
              </DropdownItem>
              <DropdownItem className="hover:bg-primary hover:text-button-secondary">
                Take Profit Limit
              </DropdownItem>
              <DropdownItem className="hover:bg-primary hover:text-button-secondary">
                Take Profit Market
              </DropdownItem>
            </DropdownGroup>
          </DropdownContent>
        </DropdownMenu> */}
        <div className="absolute bottom-1 right-1 hidden lg:block">
          <FundingTradeButton />
        </div>
      </div>

      <OrderViews />
    </div>
  );
};

export default Order;
