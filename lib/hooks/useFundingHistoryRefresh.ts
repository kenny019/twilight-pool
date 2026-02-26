import { useQuery } from "@tanstack/react-query";
import { useTwilightStore } from "../providers/store";
import { createQueryTradeOrderMsg } from "../twilight/zkos";
import { useSessionStore } from "../providers/session";
import { queryOrderFundingHistory } from "../api/relayer";
import { useWallet } from "@cosmos-kit/react-lite";
import { WalletStatus } from "@cosmos-kit/core";

/**
 * Fetches funding history for all FILLED trades when triggered by
 * useFundingCycleTrigger or on mount. Stores results in Zustand (persisted).
 */
export function useFundingHistoryRefresh() {
  const tradeOrders = useTwilightStore((state) => state.trade.trades);
  const updateTradeFundingHistory = useTwilightStore(
    (state) => state.trade.updateTradeFundingHistory
  );
  const updateTradeHistoryFundingHistory = useTwilightStore(
    (state) => state.trade_history.updateTradeFundingHistory
  );

  const { status, mainWallet } = useWallet();
  const twilightAddress = mainWallet?.getChainWallet("nyks")?.address;
  const privateKey = useSessionStore((state) => state.privateKey);

  const filledTrades = tradeOrders.filter((t) => t.orderStatus === "FILLED");
  const hasFilledTrades = filledTrades.length > 0;
  const isConnected = status === WalletStatus.Connected;

  useQuery({
    queryKey: ["funding-history-refresh", twilightAddress, filledTrades.length],
    queryFn: async () => {
      if (!privateKey || filledTrades.length === 0) return true;

      for (const trade of filledTrades) {
        try {
          const msg = await createQueryTradeOrderMsg({
            address: trade.accountAddress,
            orderStatus: trade.orderStatus,
            signature: privateKey,
          });

          const history = await queryOrderFundingHistory(msg);
          if (history !== null) {
            updateTradeFundingHistory(trade.uuid, history);
            updateTradeHistoryFundingHistory(trade.uuid, history);
          }
        } catch (err) {
          console.warn("useFundingHistoryRefresh: fetch failed for", trade.uuid, err);
        }
      }

      return true;
    },
    enabled: isConnected && hasFilledTrades && !!privateKey,
    refetchOnMount: true,
    staleTime: 60_000,
  });
}
