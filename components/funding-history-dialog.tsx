"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "./dialog";
import Button from "./button";
import { useSessionStore } from "@/lib/providers/session";
import { useTwilightStore } from "@/lib/providers/store";
import { createQueryTradeOrderMsg } from "@/lib/twilight/zkos";
import { queryOrderFundingHistory } from "@/lib/api/relayer";
import { TradeOrder } from "@/lib/types";
import Big from "big.js";
import dayjs from "dayjs";
import { Loader2, RefreshCw } from "lucide-react";
import cn from "@/lib/cn";
import { capitaliseFirstLetter, formatSatsMBtc } from "@/lib/helpers";

type Props = {
  trade: TradeOrder | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function FundingHistoryDialog({ trade, open, onOpenChange }: Props) {
  const privateKey = useSessionStore((state) => state.privateKey);
  const updateTradeFundingHistory = useTwilightStore(
    (state) => state.trade.updateTradeFundingHistory
  );
  const updateTradeHistoryFundingHistory = useTwilightStore(
    (state) => state.trade_history.updateTradeFundingHistory
  );

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [displayHistory, setDisplayHistory] = useState<
    NonNullable<TradeOrder["fundingHistory"]>
  >([]);

  const cachedHistory = trade?.fundingHistory;

  const fetchFundingHistory = useCallback(async (forceRefresh = false) => {
    if (!trade || !privateKey) return;

    const useCached =
      !forceRefresh && cachedHistory && cachedHistory.length > 0;

    if (useCached) {
      setDisplayHistory(cachedHistory);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const msg = await createQueryTradeOrderMsg({
        address: trade.accountAddress,
        orderStatus: trade.orderStatus,
        signature: privateKey,
      });

      const history = await queryOrderFundingHistory(msg);

      if (history === null) {
        setError("Failed to fetch funding history");
        return;
      }

      setDisplayHistory(history);
      updateTradeFundingHistory(trade.uuid, history);
      updateTradeHistoryFundingHistory(trade.uuid, history);
    } catch (err) {
      console.error("FundingHistoryDialog fetch error:", err);
      setError(
        err instanceof Error ? err.message : "Failed to fetch funding history"
      );
    } finally {
      setIsLoading(false);
    }
  }, [
    trade,
    privateKey,
    cachedHistory,
    updateTradeFundingHistory,
    updateTradeHistoryFundingHistory,
  ]);

  useEffect(() => {
    if (!open || !trade) return;
    if (cachedHistory && cachedHistory.length > 0) {
      setDisplayHistory(cachedHistory);
    }
    fetchFundingHistory(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, trade?.uuid]);

  const totalPaymentSats = displayHistory.reduce(
    (sum, e) => sum + Big(e.payment).toNumber(),
    0
  );

  if (!trade) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogTitle>Funding History</DialogTitle>
        <div className="flex flex-col gap-4">
          {!privateKey ? (
            <p className="text-sm text-muted-foreground">
              Connect your wallet to view funding history.
            </p>
          ) : isLoading && displayHistory.length === 0 ? (
            <div className="flex items-center justify-center gap-2 py-8">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">Loading funding history...</span>
            </div>
          ) : error && displayHistory.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-6">
              <p className="text-sm text-red">{error}</p>
              <Button
                variant="ui"
                size="small"
                onClick={() => fetchFundingHistory(true)}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry
              </Button>
            </div>
          ) : displayHistory.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No funding was applied to this order.
            </p>
          ) : (
            <>
              <div className="max-h-[280px] overflow-auto rounded border">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-muted/50">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">
                        Time
                      </th>
                      <th className="px-3 py-2 text-left font-medium">
                        Side
                      </th>
                      <th className="px-3 py-2 text-right font-medium">
                        Payment (mBTC)
                      </th>
                      <th className="px-3 py-2 text-right font-medium">
                        Rate
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayHistory.map((entry, i) => (
                      <tr
                        key={`${entry.time}-${i}`}
                        className="border-t border-border/50"
                      >
                        <td className="px-3 py-2">
                          {dayjs(entry.time).format("DD/MM/YYYY HH:mm:ss")}
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={cn(
                              "rounded px-2 py-0.5 text-xs font-medium",
                              entry.position_side === "LONG"
                                ? "bg-green-medium/10 text-green-medium"
                                : "bg-red/10 text-red"
                            )}
                          >
                            {capitaliseFirstLetter(entry.position_side)}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right font-medium">
                          {formatSatsMBtc(Big(entry.payment).toNumber())}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {parseFloat(entry.funding_rate || "0").toFixed(5)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between border-t pt-3">
                <span className="text-sm font-medium">Total funding applied</span>
                <span
                  className={cn(
                    "font-medium",
                    totalPaymentSats > 0
                      ? "text-green-medium"
                      : totalPaymentSats < 0
                        ? "text-red"
                        : ""
                  )}
                >
                  {formatSatsMBtc(totalPaymentSats)} mBTC
                </span>
              </div>
              <Button
                variant="ui"
                size="small"
                onClick={() => fetchFundingHistory(true)}
                disabled={isLoading}
                className="self-end"
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Refresh
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default FundingHistoryDialog;
