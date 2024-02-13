"use client";
import Button from "@/components/button";
import { Text } from "@/components/typography";
import { useTwilightStore } from "@/lib/state/store";
import React from "react";

const OrderMyTrades = () => {
  const tradeOrders = useTwilightStore((state) => state.trade.trades);

  return (
    <div className="space-y-2">
      <div className="flex space-x-2 px-2">
        <Text className="select-none text-xs text-primary-accent">
          Contracts
        </Text>
        <Text className="select-none text-xs text-primary-accent">Qty</Text>
        <Text className="select-none text-xs text-primary-accent">Price</Text>
      </div>
      <div>
        {tradeOrders.map((trade) => (
          <div className="flex space-x-2 px-2" key={trade.accountAddress}>
            <Text>BTCUSD</Text>
            <Text>+1.00</Text>
            <Text>{trade.value}</Text>
            <Button variant="ui" size="small">
              Close
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default OrderMyTrades;
