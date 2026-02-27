import { useQuery } from "@tanstack/react-query";
import { useTwilightStore } from "../providers/store";
import { createQueryTradeOrderMsg } from "../twilight/zkos";
import { useSessionStore } from "../providers/session";
import { queryTradeOrder } from "../api/relayer";
import { queryTransactionHashes } from "../api/rest";
import type { TransactionHash } from "../api/rest";
import type { QueryTradeOrderData } from "../api/relayer";
import Big from "big.js";
import { TradeOrder, ZkAccount } from "../types";
import { useWallet } from "@cosmos-kit/react-lite";
import { WalletStatus } from "@cosmos-kit/core";
import dayjs from "dayjs";

/**
 * Reconciles orphaned ZK accounts (accounts in zkAccounts with no matching trade
 * in trade.trades) by querying transaction_hashes and recovering any orders
 * that exist on the relayer. Used for browser crash / tab kill recovery
 * (Scenario C: order sent to relayer but addTrade never ran).
 */
export const useReconcileOrphanedAccounts = () => {
  const zkAccounts = useTwilightStore((state) => state.zk.zkAccounts);
  const trades = useTwilightStore((state) => state.trade.trades);
  const addTrade = useTwilightStore((state) => state.trade.addTrade);
  const addTradeHistory = useTwilightStore(
    (state) => state.trade_history.addTrade
  );
  const updateZkAccount = useTwilightStore((state) => state.zk.updateZkAccount);

  const { status } = useWallet();
  const privateKey = useSessionStore((state) => state.privateKey);

  useQuery({
    queryKey: [
      "reconcile-orphaned-accounts",
      status,
      privateKey,
      zkAccounts.length,
      trades.length,
    ],
    queryFn: async () => {
      if (status !== WalletStatus.Connected || !privateKey)
        return { reconciled: 0 };

      const tradeAddresses = new Set(trades.map((t) => t.accountAddress));

      const orphanedAccounts = zkAccounts.filter(
        (acc): acc is ZkAccount =>
          acc.type === "Coin" &&
          acc.tag !== "main" &&
          !tradeAddresses.has(acc.address)
      );

      if (orphanedAccounts.length === 0) return { reconciled: 0 };

      let reconciled = 0;

      for (const account of orphanedAccounts) {
        try {
          const txHashesRes = await queryTransactionHashes(account.address);

          if (
            !txHashesRes ||
            !Object.hasOwn(txHashesRes, "result") ||
            !Array.isArray(txHashesRes.result) ||
            txHashesRes.result.length === 0
          ) {
            continue;
          }

          const txHashEntries = txHashesRes.result as TransactionHash[];

          const latestEntry = txHashEntries.sort(
            (a, b) =>
              new Date(b.datetime).getTime() - new Date(a.datetime).getTime()
          )[0];

          const queryTradeOrderMsg = await createQueryTradeOrderMsg({
            address: account.address,
            orderStatus: latestEntry.order_status,
            signature: privateKey,
          });

          const queryTradeOrderRes = await queryTradeOrder(queryTradeOrderMsg);

          if (!queryTradeOrderRes?.result) continue;

          const traderOrderInfo =
            queryTradeOrderRes.result as QueryTradeOrderData;

          const existingByUuid = trades.some(
            (t) =>
              t.uuid === traderOrderInfo.uuid || t.uuid === latestEntry.order_id
          );
          if (existingByUuid) continue;

          const isOpen =
            traderOrderInfo.order_status !== "CANCELLED" &&
            traderOrderInfo.order_status !== "SETTLED" &&
            traderOrderInfo.order_status !== "LIQUIDATE";

          const initialMargin = new Big(
            traderOrderInfo.initial_margin
          ).toNumber();
          const unrealizedPnl = new Big(
            traderOrderInfo.unrealized_pnl || 0
          ).toNumber();

          const newTrade: TradeOrder = {
            accountAddress: account.address,
            orderStatus: traderOrderInfo.order_status,
            positionType: traderOrderInfo.position_type,
            orderType: traderOrderInfo.order_type,
            tx_hash: latestEntry.tx_hash,
            uuid: traderOrderInfo.uuid || latestEntry.order_id,
            value: account.value ?? initialMargin,
            output: latestEntry.output,
            entryPrice: new Big(traderOrderInfo.entryprice).toNumber(),
            leverage: parseInt(traderOrderInfo.leverage, 10) || 1,
            date: dayjs(traderOrderInfo.timestamp).toDate(),
            isOpen,
            availableMargin: new Big(
              traderOrderInfo.available_margin
            ).toNumber(),
            bankruptcyPrice: new Big(
              traderOrderInfo.bankruptcy_price
            ).toNumber(),
            bankruptcyValue: new Big(
              traderOrderInfo.bankruptcy_value
            ).toNumber(),
            entryNonce: traderOrderInfo.entry_nonce,
            entrySequence: traderOrderInfo.entry_sequence,
            executionPrice: new Big(traderOrderInfo.execution_price).toNumber(),
            initialMargin,
            liquidationPrice: new Big(
              traderOrderInfo.liquidation_price
            ).toNumber(),
            maintenanceMargin: new Big(
              traderOrderInfo.maintenance_margin
            ).toNumber(),
            positionSize: new Big(traderOrderInfo.positionsize).toNumber(),
            settlementPrice: new Big(
              traderOrderInfo.settlement_price
            ).toNumber(),
            unrealizedPnl,
            realizedPnl: !isOpen
              ? traderOrderInfo.order_status === "LIQUIDATE"
                ? -initialMargin
                : unrealizedPnl
              : undefined,
            feeFilled: new Big(traderOrderInfo.fee_filled || 0).toNumber(),
            feeSettled: new Big(traderOrderInfo.fee_settled || 0).toNumber(),
            exit_nonce: traderOrderInfo.exit_nonce,
            settleLimit: traderOrderInfo.settle_limit,
            takeProfit: traderOrderInfo.take_profit ?? undefined,
            stopLoss: traderOrderInfo.stop_loss ?? undefined,
            fundingApplied: traderOrderInfo.funding_applied,
          };

          addTrade(newTrade);
          addTradeHistory(newTrade);

          if (isOpen && traderOrderInfo.order_status === "FILLED") {
            updateZkAccount(account.address, {
              ...account,
              type: "Memo",
            });
          }

          reconciled++;
        } catch (err) {
          console.error(
            `useReconcileOrphanedAccounts: failed for ${account.address}`,
            err
          );
        }
      }

      return { reconciled };
    },
    enabled:
      status === WalletStatus.Connected &&
      !!privateKey &&
      zkAccounts.length > 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    staleTime: 60_000,
  });
};
