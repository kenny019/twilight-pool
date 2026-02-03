import { useQuery } from "@tanstack/react-query";
import { useTwilightStore } from "../providers/store";
import { createQueryTradeOrderMsg } from "../twilight/zkos";
import { useSessionStore } from "../providers/session";
import { queryTradeOrder } from "../api/relayer";
import Big from "big.js";
import { TradeOrder, ZkAccount } from "../types";
import { useWallet } from "@cosmos-kit/react-lite";
import { WalletStatus } from "@cosmos-kit/core";
import { useCallback } from "react";
import { ZkPrivateAccount } from "../zk/account";
import { createZkAccount } from "../twilight/zk";
import { useToast } from "./useToast";
import Link from 'next/link';
import BTC from '../twilight/denoms';
import { queryTransactionHashes } from '../api/rest';

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
};

export const useSyncTrades = () => {
  const tradeOrders = useTwilightStore((state) => state.trade.trades);
  const removeTrade = useTwilightStore((state) => state.trade.removeTrade);

  const setNewTrades = useTwilightStore((state) => state.trade.setNewTrades);
  const addTradeHistory = useTwilightStore(
    (state) => state.trade_history.addTrade
  );

  const updateZkAccount = useTwilightStore((state) => state.zk.updateZkAccount);

  const { toast } = useToast();

  const removeZkAccount = useTwilightStore((state) => state.zk.removeZkAccount);
  const zkAccounts = useTwilightStore((state) => state.zk.zkAccounts);
  const tradingAccount = zkAccounts.find((account) => account.tag === "main");

  const addTransactionHistory = useTwilightStore(
    (state) => state.history.addTransaction
  );

  const { status, mainWallet } = useWallet();

  const chainWallet = mainWallet?.getChainWallet("nyks");
  const twilightAddress = chainWallet?.address;

  const privateKey = useSessionStore((state) => state.privateKey);

  const cleanupTradeOrder = useCallback(
    async (privateKey: string, zkAccount: ZkAccount, tradeOrder: TradeOrder) => {
      if (!twilightAddress || !tradingAccount) {
        return {
          success: false,
          message: "An unexpected error occurred",
        };
      }

      if (!zkAccount.value) {
        return {
          success: false,
          message: "ZkAccount does not have a value",
        };
      }

      const senderZkPrivateAccount = await ZkPrivateAccount.create({
        signature: privateKey,
        existingAccount: zkAccount,
      });

      console.log("senderZkPrivateAccount", senderZkPrivateAccount.get());

      let privateTxSingleResult: any;

      if (!tradingAccount.value || !tradingAccount.isOnChain) {
        const newTradingAccount = await createZkAccount({
          tag: "main",
          signature: privateKey,
        });

        privateTxSingleResult = await senderZkPrivateAccount.privateTxSingle(
          zkAccount.value,
          newTradingAccount.address,
          0
        );
      } else {
        privateTxSingleResult = await senderZkPrivateAccount.privateTxSingle(
          zkAccount.value,
          tradingAccount.address,
          tradingAccount.value
        );
      }

      if (!privateTxSingleResult.success) {
        return {
          success: false,
          message: privateTxSingleResult.message,
        };
      }

      const {
        scalar: updatedTradingAccountScalar,
        txId,
        updatedAddress: updatedTradingAccountAddress,
      } = privateTxSingleResult.data;

      updateZkAccount(tradingAccount.address, {
        ...tradingAccount,
        address: updatedTradingAccountAddress,
        scalar: updatedTradingAccountScalar,
        value: Big(zkAccount.value)
          .add(tradingAccount.value || 0)
          .toNumber(),
        isOnChain: true,
      });

      addTransactionHistory({
        date: new Date(),
        from: zkAccount.address,
        fromTag: zkAccount.tag,
        to: updatedTradingAccountAddress,
        toTag: "Trading Account",
        tx_hash: txId,
        type: "Transfer",
        value: zkAccount.value,
      });

      removeZkAccount(zkAccount);
      removeTrade(tradeOrder);

      toast({
        title: "Success",
        description: (
          <div className="opacity-90">
            {`Successfully sent ${new BTC("sats", Big(zkAccount.value))
              .convert("BTC")
              .toString()} BTC to the Trading Account.`}
            <Link
              href={`${process.env.NEXT_PUBLIC_EXPLORER_URL as string}/tx/${txId}`}
              target={"_blank"}
              className="text-sm underline hover:opacity-100"
            >
              Explorer link
            </Link>
          </div>
        )
      })

      return {
        success: true,
      };
    },
    [
      toast,
      updateZkAccount,
      addTransactionHistory,
      removeZkAccount,
      tradingAccount,
      twilightAddress,
      removeTrade,
    ]
  );

  useQuery({
    queryKey: ["sync-trades", twilightAddress],
    queryFn: async () => {
      if (status !== WalletStatus.Connected) return true;

      if (tradeOrders.length === 0) return true;

      const updated = new Map<string, Partial<TradeOrder>>();

      for (const trade of tradeOrders) {
        if (statusToSkip.includes(trade.orderStatus)) continue;

        const queryTradeOrderMsg = await createQueryTradeOrderMsg({
          address: trade.accountAddress,
          orderStatus: trade.orderStatus,
          signature: privateKey,
        });

        const queryTradeOrderRes = await queryTradeOrder(queryTradeOrderMsg);
        const queryTxHashRes = await queryTransactionHashes(trade.accountAddress)

        if (!queryTradeOrderRes || !queryTxHashRes.result) {
          continue;
        }

        const traderOrderInfo = queryTradeOrderRes.result;
        const txHashData = queryTxHashRes.result;

        const foundTxHashData = txHashData.filter((data) => data.order_status === traderOrderInfo.order_status)

        const updatedTradeData: Record<string, any> = {
          tx_hash: foundTxHashData[0] ? foundTxHashData[0].tx_hash : undefined
        };

        for (const [key, value] of Object.entries(traderOrderInfo)) {
          const tradeKey =
            tradeInfoKeysToTradeKey[
            key as keyof typeof tradeInfoKeysToTradeKey
            ];

          if (!(tradeKey in trade)) {
            continue;
          }

          let updatedValue = value;

          if (keysToUpdateNumber.includes(tradeKey)) {
            updatedValue = new Big(value).toNumber();
          }

          const currentValue = trade[tradeKey as keyof TradeOrder];

          if (currentValue === updatedValue) {
            continue;
          }

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

      if (updated.size < 1) {
        return true;
      }

      const mergedTrades: Array<TradeOrder> = [];

      for (const trade of tradeOrders) {
        const updatedTrade = updated.get(trade.uuid);

        if (updatedTrade) {
          const newTrade = {
            ...trade,
            ...updatedTrade,
          };

          console.log("updatedTrade", updatedTrade);

          mergedTrades.push(newTrade);

          // update zk account balance
          if (
            newTrade.orderStatus === "SETTLED" ||
            newTrade.orderStatus === "LIQUIDATE" ||
            newTrade.orderStatus === "CANCELLED"
          ) {
            const newBalance = Math.round(newTrade.availableMargin);

            const existingZkAccount = zkAccounts.find(
              (account) => account.address === newTrade.accountAddress
            );

            if (existingZkAccount) {
              if (newTrade.orderStatus === "LIQUIDATE") {
                removeZkAccount(existingZkAccount)
              }
              else {
                const zkAccountWithUpdatedData: ZkAccount = {
                  ...existingZkAccount,
                  value: newBalance,
                  type: newTrade.orderStatus === "CANCELLED" ? "Coin" : "CoinSettled"
                }

                await cleanupTradeOrder(privateKey, zkAccountWithUpdatedData, newTrade);
              }

            }
          }

          // order status changed, add to history
          if (updatedTrade.orderStatus) {
            console.log(
              "adding to history",
              trade.orderStatus,
              updatedTrade.orderStatus
            );

            addTradeHistory(newTrade);

          }
        } else {
          mergedTrades.push(trade);
        }
      }

      setNewTrades(mergedTrades);

      return true;
    },
    refetchInterval: 3000,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchIntervalInBackground: true,
  });
};
