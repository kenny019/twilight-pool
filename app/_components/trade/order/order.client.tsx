import { Tabs, TabsList, TabsTrigger } from "@/components/tabs";
import { ChevronDown } from "lucide-react";
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
    <div className="w-full space-y-2 py-2">
      <div className="flex w-full items-center border-b pl-3 ">
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
        <DropdownMenu>
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
        </DropdownMenu>
      </div>

      <OrderViews />
    </div>
  );
};

export default Order;
