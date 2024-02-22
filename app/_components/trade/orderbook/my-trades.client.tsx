"use client";
import Button from "@/components/button";
import { Text } from "@/components/typography";
import { executeTradeOrder } from "@/lib/api/client";
import cn from "@/lib/cn";
import { useToast } from "@/lib/hooks/useToast";
import { useSessionStore } from "@/lib/providers/session";
import { useTwilightStore } from "@/lib/providers/store";
import { useTwilight } from "@/lib/providers/twilight";
import BTC from "@/lib/twilight/denoms";
import { executeTradeLendOrderMsg } from "@/lib/twilight/zkos";
import { TradeOrder } from "@/lib/types";
import Big from "big.js";
import React from "react";

const OrderMyTrades = () => {
  const { toast } = useToast();

  const privateKey = useSessionStore((state) => state.privateKey);

  const tradeOrders = useTwilightStore((state) => state.trade.trades);
  const removeTrade = useTwilightStore((state) => state.trade.removeTrade);

  async function settleOrder(tradeOrder: TradeOrder) {
    if (!tradeOrder.output) return;

    try {
      console.log({
        address: tradeOrder.accountAddress,
        orderStatus: tradeOrder.orderStatus,
        orderType: tradeOrder.orderType,
        outputMemo: tradeOrder.output,
        transactionType: "ORDERTX",
        uuid: tradeOrder.uuid,
        signature: privateKey,
        executionPricePoolshare: 1, // todo: fix for non market order
      });

      const msg = await executeTradeLendOrderMsg({
        address: tradeOrder.accountAddress,
        orderStatus: tradeOrder.orderStatus,
        orderType: tradeOrder.orderType,
        outputMemo: tradeOrder.output,
        transactionType: "ORDERTX",
        uuid: tradeOrder.uuid,
        signature: privateKey,
        executionPricePoolshare: 1, // todo: fix for non market order
      });

      console.log("msg", msg);
      await executeTradeOrder(msg);

      removeTrade(tradeOrder);

      toast({
        title: "Success",
        description: `Successfully closed ${tradeOrder.orderType.toLowerCase()} order`,
      });
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex space-x-2 px-2">
        <Text className="select-none text-xs text-primary-accent">
          Contracts
        </Text>
        <Text className="select-none text-xs text-primary-accent">Qty</Text>
        <Text className="select-none text-xs text-primary-accent">Type</Text>
      </div>
      <div>
        {tradeOrders.map((trade) => {
          const quantity = new BTC("sats", Big(trade.value))
            .convert("BTC")
            .toString();
          return (
            <div
              className="flex space-x-2 px-2 font-ui text-xs"
              key={trade.accountAddress}
            >
              <Text>BTCUSD</Text>
              <Text
                className={cn(
                  trade.positionType === "LONG"
                    ? "text-green-medium"
                    : "text-red"
                )}
              >
                {quantity}
              </Text>
              <Text>{trade.orderType}</Text>
              <Button
                onClick={async (e) => {
                  e.preventDefault();
                  await settleOrder(trade);
                }}
                variant="ui"
                size="small"
              >
                Close
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default OrderMyTrades;
