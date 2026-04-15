"use client";

import { useState } from "react";
import {
  DropdownContent,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
} from "@/components/dropdown";
import { Dialog, DialogContent, DialogTitle } from "@/components/dialog";
import Button from "@/components/button";
import { TradeOrder } from "@/lib/types";
import { ChevronDown, Trash2 } from "lucide-react";

interface RemoveOrdersDropdownProps {
  trade: TradeOrder;
  cancelOrder: (
    order: TradeOrder,
    options?: { sl_bool?: boolean; tp_bool?: boolean }
  ) => Promise<void>;
  isCancelling: boolean;
  disabled?: boolean;
  variant?: "cards" | "table" | "inline";
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

  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  const withConfirm = (fn: () => void) => {
    setPendingAction(() => fn);
  };

  const handleConfirm = () => {
    pendingAction?.();
    setPendingAction(null);
  };

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
        className="h-8 px-3 text-xs transition-all duration-150 hover:border-red/30 hover:text-red/90 hover:brightness-110"
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
        className="hover:border-red/30 hover:text-red/90"
      >
        {isCancelling ? "..." : "Remove"}
        <ChevronDown className="ml-0.5 h-3 w-3 opacity-70" />
      </Button>
    );

  if (variant === "inline") {
    return (
      <>
        <div className="flex flex-col">
          {hasAny && (
            <button
              type="button"
              disabled={disabled || isCancelling}
              onClick={() => withConfirm(handleRemoveAll)}
              className="flex w-full items-center gap-2 rounded px-2 py-2 text-sm text-red/70 transition-colors hover:bg-red/5 hover:text-red disabled:opacity-40"
            >
              <Trash2 className="h-3.5 w-3.5 shrink-0" />
              Remove All
            </button>
          )}
          {hasLimit && (
            <button
              type="button"
              disabled={disabled || isCancelling}
              onClick={() => withConfirm(handleRemoveLimit)}
              className="flex w-full items-center gap-2 rounded px-2 py-2 text-sm text-red/70 transition-colors hover:bg-red/5 hover:text-red disabled:opacity-40"
            >
              <Trash2 className="h-3.5 w-3.5 shrink-0" />
              Remove Limit Order
            </button>
          )}
          {hasSl && (
            <button
              type="button"
              disabled={disabled || isCancelling}
              onClick={() => withConfirm(handleRemoveSl)}
              className="flex w-full items-center gap-2 rounded px-2 py-2 text-sm text-red/70 transition-colors hover:bg-red/5 hover:text-red disabled:opacity-40"
            >
              <Trash2 className="h-3.5 w-3.5 shrink-0" />
              Remove Stop Loss
            </button>
          )}
          {hasTp && (
            <button
              type="button"
              disabled={disabled || isCancelling}
              onClick={() => withConfirm(handleRemoveTp)}
              className="flex w-full items-center gap-2 rounded px-2 py-2 text-sm text-red/70 transition-colors hover:bg-red/5 hover:text-red disabled:opacity-40"
            >
              <Trash2 className="h-3.5 w-3.5 shrink-0" />
              Remove Take Profit
            </button>
          )}
          {hasSl && hasTp && (
            <button
              type="button"
              disabled={disabled || isCancelling}
              onClick={() => withConfirm(handleRemoveTpAndSl)}
              className="flex w-full items-center gap-2 rounded px-2 py-2 text-sm text-red/70 transition-colors hover:bg-red/5 hover:text-red disabled:opacity-40"
            >
              <Trash2 className="h-3.5 w-3.5 shrink-0" />
              Remove Stop Loss &amp; Take Profit
            </button>
          )}
        </div>

        <Dialog
          open={pendingAction !== null}
          onOpenChange={(open) => {
            if (!open) setPendingAction(null);
          }}
        >
          <DialogContent className="max-w-sm">
            <DialogTitle className="text-sm font-semibold">
              Remove order?
            </DialogTitle>
            <p className="text-sm text-primary/60">
              This will immediately cancel the selected conditional order(s).
              This cannot be undone.
            </p>
            <div className="flex gap-2 pt-1">
              <Button
                variant="secondary"
                size="small"
                className="flex-1"
                onClick={() => setPendingAction(null)}
              >
                Cancel
              </Button>
              <Button
                variant="ui"
                size="small"
                className="flex-1 border-red/40 text-red hover:border-red/70"
                onClick={handleConfirm}
              >
                Remove
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownTrigger asChild>{trigger}</DropdownTrigger>
        <DropdownContent align="end" className="min-w-[10rem]">
          {hasAny && (
            <DropdownItem
              onSelect={() => withConfirm(handleRemoveAll)}
              disabled={isCancelling}
            >
              Remove All
            </DropdownItem>
          )}
          {hasLimit && (
            <DropdownItem
              onSelect={() => withConfirm(handleRemoveLimit)}
              disabled={isCancelling}
            >
              Remove Close Limit Only
            </DropdownItem>
          )}
          {hasSl && (
            <DropdownItem
              onSelect={() => withConfirm(handleRemoveSl)}
              disabled={isCancelling}
            >
              Remove Stop Loss Only
            </DropdownItem>
          )}
          {hasTp && (
            <DropdownItem
              onSelect={() => withConfirm(handleRemoveTp)}
              disabled={isCancelling}
            >
              Remove Take Profit Only
            </DropdownItem>
          )}
          {hasSl && hasTp && (
            <DropdownItem
              onSelect={() => withConfirm(handleRemoveTpAndSl)}
              disabled={isCancelling}
            >
              Remove Take Profit and Stop Loss
            </DropdownItem>
          )}
        </DropdownContent>
      </DropdownMenu>

      <Dialog
        open={pendingAction !== null}
        onOpenChange={(open) => {
          if (!open) setPendingAction(null);
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogTitle className="text-sm font-semibold">
            Remove order?
          </DialogTitle>
          <p className="text-sm text-primary/60">
            This will immediately cancel the selected conditional order(s). This
            cannot be undone.
          </p>
          <div className="flex gap-2 pt-1">
            <Button
              variant="secondary"
              size="small"
              className="flex-1"
              onClick={() => setPendingAction(null)}
            >
              Cancel
            </Button>
            <Button
              variant="ui"
              size="small"
              className="flex-1 border-red/40 text-red hover:border-red/70"
              onClick={handleConfirm}
            >
              Remove
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
