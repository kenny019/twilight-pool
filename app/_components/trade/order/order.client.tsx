import Button from "@/components/button";
import { Input, NumberInput } from "@/components/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/tabs";
import { Text } from "@/components/typography";
import { ChevronDown } from "lucide-react";
import React, { useState } from "react";
import ConnectWallet from "../../layout/connect-wallet.client";
import {
  DropdownContent,
  DropdownGroup,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
} from "@/components/dropdown";
import { useWallet } from "@cosmos-kit/react-lite";
import { useGrid } from "@/lib/providers/grid";
import cn from "@/lib/cn";
import OrderLimitForm from "./forms/limit.client";

type OrderTabs = "limit" | "market";

const Order = () => {
  const [currentTab, setCurrentTab] = useState<OrderTabs>("limit");

  const { width } = useGrid();

  const { status } = useWallet();

  function OrderViews() {
    switch (currentTab) {
      case "limit": {
        // todo: extract into seperate form file
        return <OrderLimitForm />;
      }
      case "market": {
        return (
          <form
            onSubmit={(e) => e.preventDefault()}
            className="flex flex-col space-y-3 px-3"
          >
            <div className="flex justify-between space-x-4">
              <div>
                <Text className="mb-1 text-sm opacity-80" asChild>
                  <label htmlFor="input-amount-btc">Amount (BTC)</label>
                </Text>
                <Input id="input-amount-btc" placeholder="0.000" />
              </div>
              <div>
                <Text className="mb-1 text-sm opacity-80" asChild>
                  <label htmlFor="input-amount-usd">Amount (USD)</label>
                </Text>
                <Input id="input-amount-usd" placeholder="$0.00" />
              </div>
            </div>
            {status === "Connected" ? (
              <div
                className={cn(
                  "flex justify-between",
                  width < 350 ? "flex-col space-y-2" : "flex-row space-x-4"
                )}
              >
                <Button
                  className="border-green-medium py-2 text-green-medium opacity-70 transition-opacity hover:border-green-medium hover:text-green-medium hover:opacity-100"
                  variant="ui"
                >
                  Buy
                </Button>
                <Button
                  variant="ui"
                  className="border-red py-2 text-red opacity-70 transition-opacity hover:border-red hover:text-red hover:opacity-100"
                >
                  Sell
                </Button>
              </div>
            ) : (
              <ConnectWallet />
            )}
          </form>
        );
      }
    }
  }

  return (
    <div className="w-full space-y-2 py-2">
      <div className="flex w-full items-center border-b pl-3 ">
        <Tabs defaultValue={currentTab}>
          <TabsList variant="underline">
            <TabsTrigger
              onClick={() => setCurrentTab("limit")}
              value={"limit"}
              variant="underline"
            >
              Limit
            </TabsTrigger>
            <TabsTrigger
              onClick={() => setCurrentTab("market")}
              value={"market"}
              variant="underline"
            >
              Market
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
