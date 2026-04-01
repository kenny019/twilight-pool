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
    <div className="flex h-full w-full flex-col">
      <div className="sticky top-0 z-10 bg-background pt-2">
        <div className="relative flex w-full items-center justify-between border-b pl-3">
          <Tabs defaultValue={currentTab}>
            <TabsList variant="underline">
              <TabsTrigger
                onClick={() => setCurrentTab("market")}
                value={"market"}
                variant="underline"
                className="data-[state=active]:text-theme max-md:px-3 max-md:py-2 max-md:text-sm max-md:data-[state=active]:bg-theme/5"
              >
                Market
              </TabsTrigger>
              <TabsTrigger
                onClick={() => setCurrentTab("limit")}
                value={"limit"}
                variant="underline"
                className="data-[state=active]:text-theme max-md:px-3 max-md:py-2 max-md:text-sm max-md:data-[state=active]:bg-theme/5"
              >
                Limit
              </TabsTrigger>
            </TabsList>
          </Tabs>
          {/* Always-visible fund ↔ trade button: compact on mobile, pill on desktop */}
          <div className="absolute bottom-1 right-1 flex items-center">
            <div className="md:hidden">
              <FundingTradeButton type="compact" />
            </div>
            <div className="hidden md:block">
              <FundingTradeButton />
            </div>
          </div>
        </div>
      </div>

      <OrderViews />
    </div>
  );
};

export default Order;
