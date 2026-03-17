"use client";

import {
  DropdownContent,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
} from "@/components/dropdown";
import Button from "@/components/button";
import { TradeOrder } from "@/lib/types";
import { ChevronDown } from "lucide-react";

interface RemoveOrdersDropdownProps {
  trade: TradeOrder;
  cancelOrder: (
    order: TradeOrder,
    options?: { sl_bool?: boolean; tp_bool?: boolean }
  ) => Promise<void>;
  isCancelling: boolean;
  disabled?: boolean;
  variant?: "cards" | "table";
}

export function RemoveOrdersDropdown({
  trade,
  cancelOrder,
  isCancelling,
  disabled = false,
  variant = "cards",
}: RemoveOrdersDropdownProps) {
  const hasLimit = !!trade.settleLimit;
  const hasSl = !!trade.stopLoss;
  const hasTp = !!trade.takeProfit;
  const hasSltp = hasSl || hasTp;
  const hasAny = hasLimit || hasSltp;

  const handleRemoveAll = async () => {
    try {
      if (hasSltp) {
        await cancelOrder(trade, { sl_bool: true, tp_bool: true });
      }
      if (hasLimit) {
        await cancelOrder(trade);
      }
    } catch (err) {
      console.error("Failed to remove orders:", err);
    }
  };

  const handleRemoveLimit = () => {
    void cancelOrder(trade);
  };

  const handleRemoveSl = () => {
    void cancelOrder(trade, { sl_bool: true, tp_bool: false });
  };

  const handleRemoveTp = () => {
    void cancelOrder(trade, { sl_bool: false, tp_bool: true });
  };

  const handleRemoveTpAndSl = () => {
    void cancelOrder(trade, { sl_bool: true, tp_bool: true });
  };

  const trigger =
    variant === "cards" ? (
      <Button
        variant="ui"
        size="small"
        disabled={disabled || isCancelling}
        title="Remove limit, SL, or TP orders"
        className="h-8 px-3 text-xs transition-all duration-150 hover:brightness-110 hover:text-red/90 hover:border-red/30"
      >
        {isCancelling ? "Removing..." : "Remove"}
        <ChevronDown className="ml-0.5 h-3 w-3 opacity-70" />
      </Button>
    ) : (
      <Button
        variant="ui"
        size="small"
        disabled={disabled || isCancelling}
        title="Remove limit, SL, or TP orders"
        className="hover:text-red/90 hover:border-red/30"
      >
        {isCancelling ? "..." : "Remove"}
        <ChevronDown className="ml-0.5 h-3 w-3 opacity-70" />
      </Button>
    );

  return (
    <DropdownMenu>
      <DropdownTrigger asChild>
        {trigger}
      </DropdownTrigger>
      <DropdownContent align="end" className="min-w-[10rem]">
        {hasAny && (
          <DropdownItem onSelect={handleRemoveAll} disabled={isCancelling}>
            Remove All
          </DropdownItem>
        )}
        {hasLimit && (
          <DropdownItem onSelect={handleRemoveLimit} disabled={isCancelling}>
            Remove Close Limit Only
          </DropdownItem>
        )}
        {hasSl && (
          <DropdownItem onSelect={handleRemoveSl} disabled={isCancelling}>
            Remove Stop Loss Only
          </DropdownItem>
        )}
        {hasTp && (
          <DropdownItem onSelect={handleRemoveTp} disabled={isCancelling}>
            Remove Take Profit Only
          </DropdownItem>
        )}
        {hasSl && hasTp && (
          <DropdownItem onSelect={handleRemoveTpAndSl} disabled={isCancelling}>
            Remove Take Profit and Stop Loss
          </DropdownItem>
        )}
      </DropdownContent>
    </DropdownMenu>
  );
}
