import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  useIsStoreHydrated,
  useTwilightStore,
  useTwilightStoreApi,
} from "../providers/store";
import { createQueryTradeOrderMsg } from "../twilight/zkos";
import { useSessionStore } from "../providers/session";
import { queryTradeOrder } from "../api/relayer";
import { queryUtxoForAddress } from "../api/zkos";
import Big from "big.js";
import { TradeOrder, ZkAccount } from "../types";
import { useWallet } from "@cosmos-kit/react-lite";
import { WalletStatus } from "@cosmos-kit/core";
import { ZkPrivateAccount } from "../zk/account";
import { createZkAccount } from "../twilight/zk";
import { useToast } from "./useToast";
import Link from "next/link";
import BTC from "../twilight/denoms";
import { queryTransactionHashes } from "../api/rest";
import { masterAccountQueue } from "../utils/masterAccountQueue";
import {
  hasUtxoData,
  serializeTxid,
  waitForUtxoUpdate,
} from "../utils/waitForUtxoUpdate";
import { useEffect, useRef } from "react";

const statusToSkip = ["CANCELLED", "SETTLED", "LIQUIDATE"];

const keysToUpdateNumber = [
  "bankruptcyPrice",
  "bankruptcyValue",
  "maintenanceMargin",
  "entryPrice",
  "realizedPnl",
  "unrealizedPnl",
  "settlementPrice",
  "positionSize",
  "entryNonce",
  "entrySequence",
  "executionPrice",
  "initialMargin",
  "availableMargin",
  "liquidationPrice",
  "feeFilled",
  "feeSettled",
  "leverage",
  "value",
];

const tradeInfoKeysToTradeKey = {
  order_status: "orderStatus",
  available_margin: "availableMargin",
  bankruptcy_price: "bankruptcyPrice",
  bankruptcy_value: "bankruptcyValue",
  entry_nonce: "entryNonce",
  entry_sequence: "entrySequence",
  entryprice: "entryPrice",
  execution_price: "executionPrice",
  exit_nonce: "exit_nonce",
  initial_margin: "initialMargin",
  leverage: "leverage",
  liquidation_price: "liquidationPrice",
  maintenance_margin: "maintenanceMargin",
  order_type: "orderType",
  position_type: "positionType",
  positionsize: "positionSize",
  settlement_price: "settlementPrice",
  timestamp: "date",
  unrealized_pnl: "unrealizedPnl",
  fee_filled: "feeFilled",
  fee_settled: "feeSettled",
  output: "output",
  settle_limit: "settleLimit",
  take_profit: "takeProfit",
  stop_loss: "stopLoss",
  funding_applied: "fundingApplied",
};

export const useSyncTrades = () => {
  const tradeOrders = useTwilightStore((state) => state.trade.trades);
  const removeTrade = useTwilightStore((state) => state.trade.removeTrade);
  const setNewTrades = useTwilightStore((state) => state.trade.setNewTrades);
  const addTradeHistory = useTwilightStore(
    (state) => state.trade_history.addTrade
  );
  const updateZkAccount = useTwilightStore((state) => state.zk.updateZkAccount);
  const removeZkAccount = useTwilightStore((state) => state.zk.removeZkAccount);
  const addTransactionHistory = useTwilightStore(
    (state) => state.history.addTransaction
  );

  // Raw store API — queue tasks call storeApi.getState() to read the latest
  // master account state at execution time, avoiding stale closures.
  const storeApi = useTwilightStoreApi();

  const { toast } = useToast();
  const { status, mainWallet } = useWallet();

  const chainWallet = mainWallet?.getChainWallet("nyks");
  const twilightAddress = chainWallet?.address;

  const privateKey = useSessionStore((state) => state.privateKey);
  const isHydrated = useIsStoreHydrated();
  const queryClient = useQueryClient();
  const runContextRef = useRef({
    twilightAddress,
    privateKey,
    isHydrated,
  });

  runContextRef.current = {
    twilightAddress,
    privateKey,
    isHydrated,
  };

  useEffect(() => {
    void queryClient.cancelQueries({ queryKey: ["sync-trades"] });
  }, [queryClient, twilightAddress, privateKey, isHydrated]);

  const isRunActive = (runAddress: string, runPrivateKey: string) => {
    const activeContext = runContextRef.current;

    return (
      activeContext.isHydrated &&
      activeContext.twilightAddress === runAddress &&
      activeContext.privateKey === runPrivateKey
    );
  };

  useQuery({
    queryKey: ["sync-trades", twilightAddress, privateKey, isHydrated],
    queryFn: async () => {
      const runAddress = twilightAddress;
      const runPrivateKey = privateKey;

      if (
        status !== WalletStatus.Connected ||
        !runAddress ||
        !runPrivateKey ||
        !isHydrated
      )
        return true;
      if (tradeOrders.length === 0) return true;

      const updated = new Map<string, Partial<TradeOrder>>();

      for (const trade of tradeOrders) {
        if (!isRunActive(runAddress, runPrivateKey)) return true;
        if (statusToSkip.includes(trade.orderStatus)) continue;

        const queryTradeOrderMsg = await createQueryTradeOrderMsg({
          address: trade.accountAddress,
          orderStatus: trade.orderStatus,
          signature: runPrivateKey,
        });

        const queryTradeOrderRes = await queryTradeOrder(queryTradeOrderMsg);
        const queryTxHashRes = await queryTransactionHashes(
          trade.accountAddress
        );

        if (!queryTradeOrderRes || !queryTxHashRes.result) {
          continue;
        }

        const traderOrderInfo = queryTradeOrderRes.result;
        const txHashData = queryTxHashRes.result;

        const foundTxHashData = txHashData.filter(
          (data) => data.order_status === traderOrderInfo.order_status
        );

        const updatedTradeData: Record<string, unknown> = {
          tx_hash: foundTxHashData[0] ? foundTxHashData[0].tx_hash : undefined,
        };

        for (const [key, value] of Object.entries(traderOrderInfo)) {
          const tradeKey =
            tradeInfoKeysToTradeKey[
              key as keyof typeof tradeInfoKeysToTradeKey
            ];

          // Skip keys not in our mapping (tradeKey would be undefined).
          // Do NOT additionally check `tradeKey in trade` — that would drop
          // updates for fields (like takeProfit / stopLoss) that are absent
          // from trades persisted before those fields were added.
          if (!tradeKey) continue;

          let updatedValue: unknown = value;

          if (keysToUpdateNumber.includes(tradeKey)) {
            updatedValue = new Big(value as string | number).toNumber();
          }

          // For take_profit / stop_loss: only skip a null update when the
          // local value is already non-null (protects an optimistic SLTP value
          // that was set locally but the API hasn't confirmed yet). Once the
          // API returns the real object the guard won't fire and the update
          // will land. If the local value is already null/undefined, allow the
          // update through so the equality check below handles it normally.
          const currentValueForGuard = trade[tradeKey as keyof TradeOrder];
          if (
            (key === "take_profit" || key === "stop_loss") &&
            updatedValue === null &&
            currentValueForGuard != null
          ) {
            continue;
          }

          const currentValue = trade[tradeKey as keyof TradeOrder];
          if (currentValue === updatedValue) continue;

          if (key === "order_status") {
            updated.set(trade.uuid, {
              isOpen:
                traderOrderInfo.order_status === "CANCELLED" ||
                traderOrderInfo.order_status === "LIQUIDATE" ||
                traderOrderInfo.order_status === "SETTLED"
                  ? false
                  : true,
            });
          }

          updatedTradeData[tradeKey] = updatedValue;
        }

        if (Object.keys(updatedTradeData).length > 0) {
          updated.set(trade.uuid, updatedTradeData);
        }
      }

      if (updated.size < 1) return true;

      const mergedTrades: TradeOrder[] = [];
      const cleanupPromises: Promise<void>[] = [];

      for (const trade of tradeOrders) {
        const updatedTrade = updated.get(trade.uuid);
        const newTrade = updatedTrade ? { ...trade, ...updatedTrade } : trade;

        mergedTrades.push(newTrade);

        if (updatedTrade) {
          console.log("updatedTrade", updatedTrade);
        }

        const isTerminal =
          newTrade.orderStatus === "SETTLED" ||
          newTrade.orderStatus === "LIQUIDATE" ||
          newTrade.orderStatus === "CANCELLED";

        if (isTerminal) {
          if (!isRunActive(runAddress, runPrivateKey)) return true;
          // Re-read zkAccounts from the store at this moment (not from a
          // render-time closure) to avoid acting on a removed account.
          const freshZkAccounts = storeApi.getState().zk.zkAccounts;
          const existingZkAccount = freshZkAccounts.find(
            (a) => a.address === newTrade.accountAddress
          );

          if (existingZkAccount) {
            if (newTrade.orderStatus === "LIQUIDATE") {
              if (!isRunActive(runAddress, runPrivateKey)) return true;
              // The exchange already debited the master account on-chain;
              // we only need to drop the local reference.
              removeZkAccount(existingZkAccount);
            } else {
              // SETTLED or CANCELLED — merge the order-account balance back
              // into the master account via a private transfer.  Serialised
              // through the queue to prevent UTXO double-spend races.
              const newBalance = Math.round(newTrade.availableMargin);
              const accountAddress = newTrade.accountAddress;
              const accountType: ZkAccount["type"] =
                newTrade.orderStatus === "CANCELLED" ? "Coin" : "CoinSettled";
              const tradeCopy = { ...newTrade };

              const cleanupPromise = masterAccountQueue
                .enqueue(async () => {
                  if (!isRunActive(runAddress, runPrivateKey)) return;

                  // Read state at task-execution time, not closure time.
                  const state = storeApi.getState();
                  const currentZkAccount = state.zk.zkAccounts.find(
                    (a) => a.address === accountAddress
                  );
                  const currentTradingAccount = state.zk.zkAccounts.find(
                    (a) => a.tag === "main"
                  );

                  // If the account was already cleaned up by another path, bail.
                  if (!currentZkAccount) return;

                  const zkAccountToSettle: ZkAccount = {
                    ...currentZkAccount,
                    value: newBalance,
                    type: accountType,
                  };

                  if (!zkAccountToSettle.value) {
                    console.warn(
                      "useSyncTrades: order account has no value, skipping cleanup",
                      accountAddress
                    );
                    return;
                  }

                  const senderZkPrivateAccount = await ZkPrivateAccount.create({
                    signature: runPrivateKey,
                    existingAccount: zkAccountToSettle,
                  });

                  console.log(
                    "useSyncTrades senderZkPrivateAccount",
                    senderZkPrivateAccount.get()
                  );

                  let privateTxSingleResult: Awaited<
                    ReturnType<typeof senderZkPrivateAccount.privateTxSingle>
                  >;

                  if (
                    !currentTradingAccount?.isOnChain ||
                    !currentTradingAccount.value
                  ) {
                    // Master account doesn't exist on-chain yet — create a
                    // fresh one as the transfer destination.
                    const freshMasterAccount = await createZkAccount({
                      tag: "main",
                      signature: runPrivateKey,
                    });

                    privateTxSingleResult =
                      await senderZkPrivateAccount.privateTxSingle(
                        zkAccountToSettle.value,
                        freshMasterAccount.address,
                        0
                      );

                    if (privateTxSingleResult.success) {
                      const utxoWait = await waitForUtxoUpdate(
                        privateTxSingleResult.data.updatedAddress,
                        ""
                      );
                      if (!utxoWait.success) {
                        console.warn(
                          "useSyncTrades waitForUtxoUpdate timed out (fresh master):",
                          utxoWait.message
                        );
                      }
                    }
                  } else {
                    // Snapshot current master UTXO txid before broadcast.
                    const utxoBefore = await queryUtxoForAddress(
                      currentTradingAccount.address
                    );
                    const previousTxid = hasUtxoData(utxoBefore)
                      ? serializeTxid(utxoBefore.txid)
                      : "";

                    privateTxSingleResult =
                      await senderZkPrivateAccount.privateTxSingle(
                        zkAccountToSettle.value,
                        currentTradingAccount.address,
                        currentTradingAccount.value
                      );

                    if (privateTxSingleResult.success) {
                      const utxoWait = await waitForUtxoUpdate(
                        privateTxSingleResult.data.updatedAddress,
                        previousTxid
                      );
                      if (!utxoWait.success) {
                        console.warn(
                          "useSyncTrades waitForUtxoUpdate timed out:",
                          utxoWait.message
                        );
                      }
                    }
                  }

                  if (!privateTxSingleResult.success) {
                    console.error(
                      "useSyncTrades cleanup failed:",
                      privateTxSingleResult.message
                    );
                    return;
                  }

                  const {
                    scalar: updatedTradingAccountScalar,
                    txId,
                    updatedAddress: updatedTradingAccountAddress,
                  } = privateTxSingleResult.data;

                  // Re-read trading account one final time to get the key
                  // for updateZkAccount (address may have changed if it was
                  // recreated above).
                  const latestTradingAccount = storeApi
                    .getState()
                    .zk.zkAccounts.find((a) => a.tag === "main");

                  if (latestTradingAccount) {
                    if (!isRunActive(runAddress, runPrivateKey)) return;
                    updateZkAccount(latestTradingAccount.address, {
                      ...latestTradingAccount,
                      address: updatedTradingAccountAddress,
                      scalar: updatedTradingAccountScalar,
                      value: Big(zkAccountToSettle.value)
                        .add(latestTradingAccount.value ?? 0)
                        .toNumber(),
                      isOnChain: true,
                    });
                  }

                  if (!isRunActive(runAddress, runPrivateKey)) return;
                  addTransactionHistory({
                    date: new Date(),
                    from: zkAccountToSettle.address,
                    fromTag: zkAccountToSettle.tag,
                    to: updatedTradingAccountAddress,
                    toTag: "Trading Account",
                    tx_hash: txId,
                    type: "Transfer",
                    value: zkAccountToSettle.value,
                  });

                  // Only remove the order account and trade record after the
                  // transfer is confirmed, preserving recovery options on failure.
                  if (!isRunActive(runAddress, runPrivateKey)) return;
                  removeZkAccount(zkAccountToSettle);
                  removeTrade(tradeCopy);

                  if (!isRunActive(runAddress, runPrivateKey)) return;
                  toast({
                    title: "Success",
                    description: (
                      <div className="opacity-90">
                        {`Successfully sent ${new BTC(
                          "sats",
                          Big(zkAccountToSettle.value)
                        )
                          .convert("BTC")
                          .toString()} BTC to the Trading Account.`}
                        <Link
                          href={`${
                            process.env.NEXT_PUBLIC_EXPLORER_URL as string
                          }/txs/${txId}`}
                          target={"_blank"}
                          className="text-sm underline hover:opacity-100"
                        >
                          Explorer link
                        </Link>
                      </div>
                    ),
                  });
                })
                .catch((err) => {
                  console.error(
                    "useSyncTrades cleanup queue task failed:",
                    err
                  );
                });

              cleanupPromises.push(cleanupPromise.then(() => {}));
            }
          }
        }

        // Record every status transition to trade history.
        if (updatedTrade && updatedTrade.orderStatus) {
          if (!isRunActive(runAddress, runPrivateKey)) return true;
          console.log(
            "adding to history",
            trade.orderStatus,
            updatedTrade.orderStatus
          );
          addTradeHistory(newTrade);
        }
      }

      // Wait for all cleanup tasks to complete before committing, so the
      // next poll sees consistent state.
      if (cleanupPromises.length > 0) {
        await Promise.allSettled(cleanupPromises);
      }

      // Always commit the updated trade statuses so the next poll cycle
      // skips already-terminal orders (statusToSkip check at top of loop).
      if (!isRunActive(runAddress, runPrivateKey)) return true;
      setNewTrades(mergedTrades);

      return true;
    },
    refetchInterval: 5000,
    staleTime: 5000,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchIntervalInBackground: true,
    enabled:
      status === WalletStatus.Connected &&
      !!twilightAddress &&
      !!privateKey &&
      isHydrated &&
      tradeOrders.length > 0,
  });
};
