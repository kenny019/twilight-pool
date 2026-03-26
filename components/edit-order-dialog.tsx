import { useTwilightStore } from "@/lib/providers/store";
import React, { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "./dialog";
import { NumberInput } from "./input";
import Button from "./button";
import { useToast } from "@/lib/hooks/useToast";
import { cancelZkOrder } from "@/lib/zk/trade";
import { useSessionStore, useSignStatus } from "@/lib/providers/session";
import { usePriceFeed } from "@/lib/providers/feed";
import { useQueryClient } from "@tanstack/react-query";
import { useWallet } from "@cosmos-kit/react-lite";
import { createZkOrder } from "@/lib/twilight/zk";
import { sendTradeOrder } from "@/lib/api/client";
import { queryTradeOrder } from "@/lib/api/relayer";
import { createQueryTradeOrderMsg } from "@/lib/twilight/zkos";
import { TradeOrder, PositionTypes } from "@/lib/types";
import BTC from "@/lib/twilight/denoms";
import Big from "big.js";
import dayjs from "dayjs";
import { formatCurrency } from "@/lib/twilight/ticker";
import { Loader2 } from "lucide-react";
import { waitForRequestIdConfirmation } from "@/lib/utils/requestIdConfirmation";

type Props = {
  order: TradeOrder | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingOrders: Set<string>;
  setEditingOrders: React.Dispatch<React.SetStateAction<Set<string>>>;
};

function EditOrderDialog({
  order,
  open,
  onOpenChange,
  editingOrders,
  setEditingOrders,
}: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const privateKey = useSessionStore((state) => state.privateKey);
  const { retrySign } = useSignStatus();
  const storedBtcPrice = useSessionStore((state) => state.price.btcPrice);

  const { getCurrentPrice } = usePriceFeed();
  const liveBtcPrice = getCurrentPrice();
  const currentPrice = liveBtcPrice || storedBtcPrice;

  const updateZkAccount = useTwilightStore((state) => state.zk.updateZkAccount);
  const zkAccounts = useTwilightStore((state) => state.zk.zkAccounts);
  const addTrade = useTwilightStore((state) => state.trade.addTrade);
  const updateTrade = useTwilightStore((state) => state.trade.updateTrade);
  const optInLeaderboard = useTwilightStore((state) => state.optInLeaderboard);

  const { mainWallet } = useWallet();

  const [newPrice, setNewPrice] = useState(order?.entryPrice || 0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset price when dialog opens with a new order
  React.useEffect(() => {
    if (open && order) {
      setNewPrice(order.entryPrice);
    }
  }, [open, order]);

  const entryPrice = order?.entryPrice || 0;
  const markPrice = currentPrice || entryPrice;

  const positionAmountBtc = order
    ? BTC.format(new BTC("sats", Big(order.value)).convert("BTC"), "BTC")
    : "0";

  async function handleEditOrder() {
    if (!order) return;

    if (!privateKey) {
      await retrySign();
      return;
    }

    if (newPrice <= 0) {
      toast({
        title: "Invalid price",
        description: "Please enter a valid limit price",
        variant: "error",
      });
      return;
    }

    if (editingOrders.has(order.uuid)) return;

    setEditingOrders((prev) => new Set(prev).add(order.uuid));
    setIsSubmitting(true);
    onOpenChange(false);

    const chainWallet = mainWallet?.getChainWallet("nyks");
    const twilightAddress = chainWallet?.address;

    toast({
      title: "Editing order...",
      description:
        "Please do not close this page while your order is being edited...",
    });

    try {
      // Step 1: Cancel existing order
      const cancelResult = await cancelZkOrder(order, privateKey);

      if (!cancelResult.success) {
        toast({
          title: "Failed to edit order",
          description: cancelResult.message,
          variant: "error",
        });
        return;
      }

      // Step 2: Mark account as available (Coin) after cancel
      const zkAccount = zkAccounts.find(
        (account) => account.address === order.accountAddress
      );

      if (!zkAccount) {
        toast({
          title: "Failed to edit order",
          description: "Failed to find ZK account",
          variant: "error",
        });
        return;
      }

      updateZkAccount(order.accountAddress, {
        ...zkAccount,
        type: "Coin",
      });

      // Step 3: Create new order with same account at new price
      const createResult = await createZkOrder({
        zkAccount: { ...zkAccount, type: "Coin" },
        signature: privateKey,
        value: order.value,
        positionType: order.positionType as PositionTypes,
        orderType: "LIMIT",
        leverage: order.leverage,
        entryPrice: newPrice,
        timebounds: 1,
      });

      if (!createResult.success || !createResult.msg) {
        toast({
          title: "Order cancelled but could not be re-placed",
          description:
            "Please place a new order manually. Your funds remain on-chain.",
          variant: "error",
        });
        return;
      }

      // Step 4: Send new order
      const sendResult = await sendTradeOrder(
        createResult.msg,
        optInLeaderboard ? twilightAddress : undefined
      );

      console.log("test1", sendResult);
      if (!sendResult.result || !sendResult.result.id_key) {
        toast({
          title: "Order cancelled but could not be re-placed",
          description:
            "Please place a new order manually. Your funds remain on-chain.",
          variant: "error",
        });
        return;
      }

      const transactionHashRes = await waitForRequestIdConfirmation(
        sendResult.result.id_key as string,
        {
          excludedOrderTypes: ["SLTP"],
        }
      );

      if (!transactionHashRes.success) {
        toast({
          title: "Order may have been placed",
          description:
            "Could not confirm the new order. Please check your open orders.",
          variant: "error",
        });
        return;
      }

      const orderData = transactionHashRes.event;

      // Step 6: Query full order details
      const queryTradeOrderMsg = await createQueryTradeOrderMsg({
        address: order.accountAddress,
        orderStatus: orderData.order_status,
        signature: privateKey,
      });

      const queryTradeOrderRes = await queryTradeOrder(queryTradeOrderMsg);

      if (!queryTradeOrderRes || !queryTradeOrderRes.result) {
        toast({
          title: "Order placed but details unavailable",
          description: "The order was placed. Details will sync shortly.",
          variant: "error",
        });
        return;
      }

      const traderOrderInfo = queryTradeOrderRes.result;

      console.log("test1", traderOrderInfo);

      // Step 7: Add new trade to store
      const newTradeData = {
        accountAddress: order.accountAddress,
        orderStatus: orderData.order_status,
        positionType: order.positionType,
        orderType: orderData.order_type,
        tx_hash: orderData.order_status === "PENDING" ? "" : orderData.tx_hash,
        uuid: orderData.order_id,
        value: order.value,
        output: orderData.output ?? undefined,
        entryPrice: new Big(traderOrderInfo.entryprice).toNumber(),
        leverage: order.leverage,
        date: dayjs(traderOrderInfo.timestamp).toDate(),
        isOpen: true,
        availableMargin: new Big(traderOrderInfo.available_margin).toNumber(),
        bankruptcyPrice: new Big(traderOrderInfo.bankruptcy_price).toNumber(),
        bankruptcyValue: new Big(traderOrderInfo.bankruptcy_value).toNumber(),
        entryNonce: traderOrderInfo.entry_nonce,
        entrySequence: traderOrderInfo.entry_sequence,
        executionPrice: new Big(traderOrderInfo.execution_price).toNumber(),
        initialMargin: new Big(traderOrderInfo.initial_margin).toNumber(),
        liquidationPrice: new Big(traderOrderInfo.liquidation_price).toNumber(),
        maintenanceMargin: new Big(
          traderOrderInfo.maintenance_margin
        ).toNumber(),
        positionSize: new Big(traderOrderInfo.positionsize).toNumber(),
        settlementPrice: new Big(traderOrderInfo.settlement_price).toNumber(),
        unrealizedPnl: new Big(traderOrderInfo.unrealized_pnl).toNumber(),
        feeFilled: new Big(traderOrderInfo.fee_filled).toNumber(),
        feeSettled: new Big(traderOrderInfo.fee_settled).toNumber(),
        settleLimit: traderOrderInfo.settle_limit,
        fundingApplied: traderOrderInfo.funding_applied,
      };

      updateTrade(newTradeData);

      // Step 8: Mark account as Memo and refetch
      updateZkAccount(order.accountAddress, {
        ...zkAccount,
        type: "Memo",
      });

      await queryClient.invalidateQueries({ queryKey: ["sync-trades"] });

      toast({
        title: "Order edited successfully",
        description: `Limit price updated to ${formatCurrency(newPrice)}`,
      });
    } catch (err) {
      console.error("editOrder error:", err);
      toast({
        title: "Error editing order",
        description:
          "An unexpected error occurred. Please check your open orders.",
        variant: "error",
      });
    } finally {
      setEditingOrders((prev) => {
        const next = new Set(prev);
        next.delete(order.uuid);
        return next;
      });
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>Edit Limit Order</DialogTitle>
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-primary-accent">
              Current Limit Price (USD)
            </span>
            <span className="text-sm font-medium">
              {formatCurrency(entryPrice)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-primary-accent">
              Mark Price (USD)
            </span>
            <span className="text-sm font-medium">
              {formatCurrency(markPrice)}
            </span>
          </div>

          <div className="border-t" />

          <div className="space-y-1">
            <label
              className="text-xs text-primary-accent"
              htmlFor="input-edit-entry-price"
            >
              New Limit Price (USD)
            </label>
            <NumberInput
              id="input-edit-entry-price"
              inputValue={newPrice}
              setInputValue={setNewPrice}
              currentPrice={currentPrice}
              placeholder="0.00"
            />
          </div>

          <div className="border-t" />

          <div className="flex items-center justify-between">
            <span className="text-xs text-primary-accent">Position Amount</span>
            <span className="text-sm font-medium">{positionAmountBtc} BTC</span>
          </div>

          <div className="border-t" />

          <Button onClick={handleEditOrder} disabled={isSubmitting}>
            {isSubmitting ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              "Confirm"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default EditOrderDialog;
