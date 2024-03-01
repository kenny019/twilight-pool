"use client";
import Button from "@/components/button";
import { Text } from "@/components/typography";
import { executeTradeOrder } from "@/lib/api/client";
import { TransactionHash, queryTransactionHashes } from "@/lib/api/rest";
import cn from "@/lib/cn";
import { useToast } from "@/lib/hooks/useToast";
import { useSessionStore } from "@/lib/providers/session";
import { useTwilightStore } from "@/lib/providers/store";
import { useTwilight } from "@/lib/providers/twilight";
import BTC from "@/lib/twilight/denoms";
import { getZkAccountBalance } from "@/lib/twilight/zk";
import { executeTradeLendOrderMsg } from "@/lib/twilight/zkos";
import { TradeOrder } from "@/lib/types";
import Big from "big.js";
import React from "react";

const OrderMyTrades = () => {
  const { toast } = useToast();

  const privateKey = useSessionStore((state) => state.privateKey);
  const addTradeHistory = useSessionStore((state) => state.trade.addTrade);

  const zkAccounts = useTwilightStore((state) => state.zk.zkAccounts);
  const updateZkAccount = useTwilightStore((state) => state.zk.updateZkAccount);
  const tradeOrders = useTwilightStore((state) => state.trade.trades);
  const removeTrade = useTwilightStore((state) => state.trade.removeTrade);

  async function settleOrder(tradeOrder: TradeOrder) {
    if (!tradeOrder.output) {
      toast({
        variant: "error",
        title: "Error",
        description: "Error with settling trade order",
      });
      return;
    }

    const currentAccount = zkAccounts.find(
      (account) => account.address === tradeOrder.accountAddress
    );

    if (!currentAccount) {
      toast({
        variant: "error",
        title: "Error",
        description: "Error account associated with this order is missing",
      });

      removeTrade(tradeOrder);
      return;
    }

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

      toast({
        title: "Closing order",
        description: "Action is being processed...",
      });

      const { value: newAccountBalance } = await getZkAccountBalance({
        zkAccountAddress: tradeOrder.accountAddress,
        signature: privateKey,
      });

      if (!newAccountBalance) {
        toast({
          variant: "error",
          title: "Error",
          description: "Error with settling trade order",
        });
        return;
      }

      console.log("settle account balance", newAccountBalance);

      updateZkAccount(tradeOrder.accountAddress, {
        ...currentAccount,
        value: newAccountBalance,
      });

      removeTrade(tradeOrder);

      addTradeHistory({
        accountAddress: tradeOrder.accountAddress,
        date: new Date(),
        orderStatus: "CLOSED",
        orderType: tradeOrder.orderType,
        positionType: tradeOrder.positionType,
        tx_hash: tradeOrder.tx_hash,
        uuid: tradeOrder.uuid,
        value: tradeOrder.value,
        output: tradeOrder.output,
      });

      toast({
        title: "Success",
        description: `Successfully closed ${tradeOrder.orderType.toLowerCase()} order`,
      });
    } catch (err) {
      console.error(err);
      toast({
        variant: "error",
        title: "Error",
        description: "Error with settling trade order",
      });
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
