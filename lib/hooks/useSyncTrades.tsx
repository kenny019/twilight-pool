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
  assertMasterAccountActionAllowed,
  createPendingMasterAccountRecovery,
} from "../utils/masterAccountRecovery";
import {
  hasUtxoData,
  serializeTxid,
  waitForUtxoUpdate,
} from "../utils/waitForUtxoUpdate";
import { TransactionHash } from "../api/rest";
import { useEffect, useRef } from "react";

const statusToSkip = ["CANCELLED", "SETTLED", "LIQUIDATE"];

type PriceKind = "LIMIT_CLOSE" | "STOP_LOSS" | "TAKE_PROFIT" | "NONE";

function derivePriceKind(eventStatus: string): PriceKind {
  switch (eventStatus) {
    case "LimitPriceAdded":
    case "LimitPriceUpdated":
    case "CancelledLimitClose":
      return "LIMIT_CLOSE";
    case "StopLossAdded":
    case "StopLossUpdated":
    case "CancelledStopLoss":
      return "STOP_LOSS";
    case "TakeProfitAdded":
    case "TakeProfitUpdated":
    case "CancelledTakeProfit":
      return "TAKE_PROFIT";
    default:
      return "NONE";
  }
}

/** Statuses that are allowed to be ingested even without a request_id. */
const ALLOW_WITHOUT_REQUEST_ID = new Set([
  "LIQUIDATE",
  "CancelledLimitClose",
  "CancelledStopLoss",
]);

/** Lifecycle statuses whose history rows should be enriched with fundingApplied. */
const FUNDING_ENRICHABLE_STATUSES = new Set(["FILLED", "SETTLED", "LIQUIDATE"]);

function buildIdempotencyKey(
  uuid: string,
  orderStatus: string,
  requestId: string | null
): string {
  return `${uuid}|${orderStatus}|${requestId || "NO_REQUEST_ID"}`;
}

function buildHistoryRowFromTxHash(
  trade: TradeOrder,
  txHash: TransactionHash
): TradeOrder {
  const priceKind = derivePriceKind(txHash.order_status);
  const displayPrice = txHash.new_price ?? txHash.old_price ?? null;
  const displayPriceBefore = txHash.old_price ?? null;
  const displayPriceAfter = txHash.new_price ?? null;

  return {
    ...trade,
    eventSource: "transaction_hashes",
    eventStatus: txHash.order_status,
    orderStatus: txHash.order_status,
    request_id: txHash.request_id,
    reason: txHash.reason,
    old_price: txHash.old_price,
    new_price: txHash.new_price,
    priceKind,
    displayPrice,
    displayPriceBefore,
    displayPriceAfter,
    tx_hash: txHash.tx_hash || trade.tx_hash,
    eventTimestamp: txHash.datetime ? new Date(txHash.datetime) : trade.date,
    date: txHash.datetime ? new Date(txHash.datetime) : trade.date,
    idempotency_key: buildIdempotencyKey(
      trade.uuid,
      txHash.order_status,
      txHash.request_id
    ),
  };
}

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
  const updateHistorySnapshot = useTwilightStore(
    (state) => state.trade_history.updateHistorySnapshot
  );
  const updateZkAccount = useTwilightStore((state) => state.zk.updateZkAccount);
  const removeZkAccount = useTwilightStore((state) => state.zk.removeZkAccount);
  const addZkAccount = useTwilightStore((state) => state.zk.addZkAccount);
  const setMasterAccountRecovery = useTwilightStore(
    (state) => state.zk.setMasterAccountRecovery
  );
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
      const txHashDataByUuid = new Map<string, TransactionHash[]>();
      const traderOrderInfoByUuid = new Map<
        string,
        { order_status: string; funding_applied: string }
      >();

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

        // Store traderOrderInfo for funding enrichment in the second loop
        traderOrderInfoByUuid.set(trade.uuid, {
          order_status: traderOrderInfo.order_status,
          funding_applied: traderOrderInfo.funding_applied,
        });

        // Store all tx hash entries for this trade's uuid for history ingestion,
        // deduplicated by idempotency key to avoid duplicate rows when the API
        // returns multiple entries for the same logical event.
        const tradeMatchedTxHashes = txHashData.filter(
          (data) => data.order_id === trade.uuid
        );
        if (tradeMatchedTxHashes.length > 0) {
          const seen = new Set<string>();
          const deduped = tradeMatchedTxHashes.filter((tx) => {
            const key = buildIdempotencyKey(
              trade.uuid,
              tx.order_status,
              tx.request_id
            );
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
          txHashDataByUuid.set(trade.uuid, deduped);
        }

        const foundTxHashData = txHashData.filter(
          (data) => data.order_status === traderOrderInfo.order_status
        );

        const updatedTradeData: Record<string, unknown> = {
          tx_hash: foundTxHashData[0]
            ? foundTxHashData[0].tx_hash || undefined
            : undefined,
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

          const currentValueForGuard = trade[tradeKey as keyof TradeOrder];
          // Don't overwrite a valid positionSize with 0 — some API endpoints
          // (e.g. SLTP placement response) omit positionsize, causing the field
          // to come back as 0 and breaking all PnL calculations in the dialog.
          if (
            key === "positionsize" &&
            updatedValue === 0 &&
            (currentValueForGuard as number) > 0
          ) {
            continue;
          }
          // Some relayer responses can transiently return an empty/invalid
          // position_type. Keep a valid local value in that case so downstream
          // PnL calculations don't collapse to 0.
          if (key === "position_type") {
            const normalized =
              typeof updatedValue === "string"
                ? updatedValue.toUpperCase()
                : "";
            const isValidIncoming =
              normalized === "LONG" || normalized === "SHORT";
            const currentNormalized =
              typeof currentValueForGuard === "string"
                ? currentValueForGuard.toUpperCase()
                : "";
            const hasValidCurrent =
              currentNormalized === "LONG" || currentNormalized === "SHORT";

            if (!isValidIncoming && hasValidCurrent) {
              continue;
            }
            if (isValidIncoming) {
              updatedValue = normalized;
            }
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

      if (updated.size < 1 && txHashDataByUuid.size < 1) return true;

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

        if (isTerminal && !storeApi.getState().zk.masterAccountBlocked) {
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
                  assertMasterAccountActionAllowed({
                    masterAccountBlocked: state.zk.masterAccountBlocked,
                    masterAccountBlockReason: state.zk.masterAccountBlockReason,
                  });
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
                  let utxoWait: Awaited<
                    ReturnType<typeof waitForUtxoUpdate>
                  > | null = null;
                  let pendingTradingAccount: ZkAccount;

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
                      utxoWait = await waitForUtxoUpdate(
                        privateTxSingleResult.data.updatedAddress,
                        ""
                      );
                    }

                    pendingTradingAccount = {
                      tag: "main",
                      type: "Coin",
                      address: privateTxSingleResult.success
                        ? privateTxSingleResult.data.updatedAddress
                        : freshMasterAccount.address,
                      scalar: privateTxSingleResult.success
                        ? privateTxSingleResult.data.scalar
                        : freshMasterAccount.scalar,
                      value: zkAccountToSettle.value,
                      isOnChain: true,
                      createdAt: currentTradingAccount?.createdAt,
                    };
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
                      utxoWait = await waitForUtxoUpdate(
                        privateTxSingleResult.data.updatedAddress,
                        previousTxid
                      );
                    }

                    pendingTradingAccount = {
                      ...currentTradingAccount,
                      address: privateTxSingleResult.success
                        ? privateTxSingleResult.data.updatedAddress
                        : currentTradingAccount.address,
                      scalar: privateTxSingleResult.success
                        ? privateTxSingleResult.data.scalar
                        : currentTradingAccount.scalar,
                      value: Big(zkAccountToSettle.value)
                        .add(currentTradingAccount.value ?? 0)
                        .toNumber(),
                      isOnChain: true,
                    };
                  }

                  if (!privateTxSingleResult.success) {
                    console.error(
                      "useSyncTrades cleanup failed:",
                      privateTxSingleResult.message
                    );
                    return;
                  }

                  if (utxoWait && !utxoWait.success) {
                    const latestTradingAccount = storeApi
                      .getState()
                      .zk.zkAccounts.find((a) => a.tag === "main");

                    if (latestTradingAccount) {
                      updateZkAccount(
                        latestTradingAccount.address,
                        pendingTradingAccount
                      );
                    } else {
                      addZkAccount(pendingTradingAccount);
                    }

                    if (!isRunActive(runAddress, runPrivateKey)) return;
                    addTransactionHistory({
                      date: new Date(),
                      from: zkAccountToSettle.address,
                      fromTag: zkAccountToSettle.tag,
                      to: pendingTradingAccount.address,
                      toTag: "Trading Account",
                      tx_hash: privateTxSingleResult.data.txId,
                      type: "Transfer",
                      value: zkAccountToSettle.value,
                    });

                    if (!isRunActive(runAddress, runPrivateKey)) return;
                    removeZkAccount(zkAccountToSettle);
                    removeTrade(tradeCopy);

                    setMasterAccountRecovery(
                      createPendingMasterAccountRecovery({
                        address: pendingTradingAccount.address,
                        scalar: pendingTradingAccount.scalar,
                        value: pendingTradingAccount.value ?? 0,
                        source: "trade cleanup transfer",
                        txId: privateTxSingleResult.data.txId,
                      })
                    );

                    throw new Error(
                      "Trading account recovery is in progress after a delayed cleanup UTXO update. Please wait for recovery to finish before placing new trades."
                    );
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
                      ...pendingTradingAccount,
                      address: updatedTradingAccountAddress,
                      scalar: updatedTradingAccountScalar,
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

        // Ingest transaction_hashes as primary event source for Order History.
        // Each tx_hash entry becomes a separate history row keyed by idempotency_key.
        // Skip entries without request_id unless their status is explicitly allowed.
        const tradeTxHashes = txHashDataByUuid.get(trade.uuid);
        if (tradeTxHashes) {
          if (!isRunActive(runAddress, runPrivateKey)) return true;
          for (const txHash of tradeTxHashes) {
            if (
              !txHash.request_id &&
              !ALLOW_WITHOUT_REQUEST_ID.has(txHash.order_status)
            ) {
              continue;
            }
            const historyRow = buildHistoryRowFromTxHash(newTrade, txHash);
            addTradeHistory(historyRow);
          }
        }

        // Enrich existing FILLED/SETTLED/LIQUIDATE history rows with
        // fundingApplied from traderOrderInfo when available.
        const orderInfo = traderOrderInfoByUuid.get(trade.uuid);
        if (
          orderInfo &&
          orderInfo.funding_applied != null &&
          FUNDING_ENRICHABLE_STATUSES.has(orderInfo.order_status)
        ) {
          updateHistorySnapshot(trade.uuid, orderInfo.order_status, {
            fundingApplied: String(orderInfo.funding_applied),
          });
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
