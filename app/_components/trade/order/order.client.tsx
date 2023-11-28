import Button from "@/components/button";
import { Input, NumberInput } from "@/components/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/tabs";
import { Text } from "@/components/typography";
import { ChevronDown } from "lucide-react";
import React, { useState } from "react";
import ConnectWallet from "../../layout/connect-wallet.client";

type OrderTabs = "limit" | "market" | "stop";

const Order = () => {
  const [currentTab, setCurrentTab] = useState<OrderTabs>("limit");

  function OrderViews() {
    switch (currentTab) {
      case "limit": {
        // todo: extract into seperate form file
        return (
          <form
            onSubmit={(e) => e.preventDefault()}
            className="flex flex-col space-y-4 px-3"
          >
            <div>
              <Text className="mb-1 text-sm opacity-80" asChild>
                <label htmlFor="input-order-price">Price (USDT)</label>
              </Text>
              <div className="flex flex-row space-x-2">
                <NumberInput id="input-order-price" />
                <Button className="" variant="ui" size="small">
                  BBO
                </Button>
              </div>
            </div>
            <div>
              <Text
                className="mb-1 flex cursor-pointer    items-center gap-1 text-sm opacity-80"
                asChild
              >
                <label htmlFor="input-order-amount">
                  Amount (Cont) <ChevronDown className="h-3 w-3" />
                </label>
              </Text>
              <Input placeholder="Single Contract value 0.01 BTC" />
            </div>
            <div className="space-y-1">
              <div className="tracking-tigther">
                <p className="text-primary-accent">
                  Available <span className="text-accent-300"> -- USDT</span>
                </p>
              </div>
              <div className="flex w-full justify-between tracking-tighter">
                <p className="text-primary-accent">
                  Max (Long) <span className="text-accent-300"> -- Cont</span>
                </p>
                <p className="text-primary-accent">
                  Max (Long) <span className="text-accent-300"> -- Cont</span>
                </p>
              </div>
            </div>
            <ConnectWallet />
          </form>
        );
      }
      case "market": {
        return <form className="flex"></form>;
      }
    }
  }

  return (
    <div className="w-full space-y-2 py-2">
      <div className="w-full border-b pl-3">
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
            <TabsTrigger
              onClick={() => setCurrentTab("stop")}
              value={"stop"}
              variant="underline"
            >
              {/* note this should actually be a button with dropdown */}
              Stop
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <OrderViews />
    </div>
  );
};

export default Order;
