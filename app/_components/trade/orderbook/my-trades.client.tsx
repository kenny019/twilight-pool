"use client";
import { executeTradeOrder } from "@/lib/api/client";
import { queryTransactionHashByRequestId, queryTransactionHashes } from "@/lib/api/rest";
import { retry, safeJSONParse, isUserRejection } from "@/lib/helpers";
import { useToast } from "@/lib/hooks/useToast";
import { useSessionStore } from "@/lib/providers/session";
import { useTwilightStore } from "@/lib/providers/store";
import { usePriceFeed } from "@/lib/providers/feed";
import { createZkAccount, createZkBurnTx, getZkAccountBalance } from "@/lib/twilight/zk";
import { createQueryTradeOrderMsg, executeTradeLendOrderMsg, verifyAccount, verifyQuisQuisTransaction } from "@/lib/twilight/zkos";
import { TradeOrder, ZkAccount } from "@/lib/types";
import BTC from "@/lib/twilight/denoms";
import Big from "big.js";
import React, { useMemo, useCallback, useState, useEffect } from "react";
import { MyTradesDataTable } from "./my-trades/data-table";
import { myTradesColumns, calculateUpnl } from "./my-trades/columns";
import { cancelTradeOrder, queryTradeOrder } from '@/lib/api/relayer';
import dayjs from 'dayjs';
import cn from "@/lib/cn";
import Link from 'next/link';
import { ZkPrivateAccount } from '@/lib/zk/account';
import { broadcastTradingTx } from '@/lib/api/zkos';
import { useWallet } from '@cosmos-kit/react-lite';
import { twilightproject } from 'twilightjs';
import Long from 'long';


const OrderMyTrades = () => {
  const { toast } = useToast();
  const { getCurrentPrice, subscribe } = usePriceFeed();
  const [, forceUpdate] = useState({});

  const privateKey = useSessionStore((state) => state.privateKey);

  const zkAccounts = useTwilightStore((state) => state.zk.zkAccounts);
  const updateTrade = useTwilightStore((state) => state.trade.updateTrade);
  const updateZkAccount = useTwilightStore((state) => state.zk.updateZkAccount);
  const removeZkAccount = useTwilightStore((state) => state.zk.removeZkAccount);

  const tradeOrders = useTwilightStore((state) => state.trade.trades);

  const removeTrade = useTwilightStore((state) => state.trade.removeTrade);

  // Subscribe to price updates to refresh price-dependent columns
  useEffect(() => {
    const unsubscribe = subscribe(() => {
      forceUpdate({});
    });

    return unsubscribe;
  }, [subscribe]);


  const { mainWallet } = useWallet();

  const chainWallet = mainWallet?.getChainWallet("nyks");
  const twilightAddress = chainWallet?.address

  const addTransactionHistory = useTwilightStore(
    (state) => state.history.addTransaction
  );

  const cleanupTradeOrder = useCallback(async (privateKey: string, zkAccount: ZkAccount) => {
    if (!twilightAddress) {
      return {
        success: false,
        message: "Twilight address not found",
      }
    }

    if (!zkAccount.value) {
      return {
        success: false,
        message: "ZkAccount does not have a value",
      }
    }

    const transientZkAccount = await createZkAccount({
      tag: "transient",
      signature: privateKey,
    });

    const senderZkPrivateAccount = await ZkPrivateAccount.create({
      signature: privateKey,
      existingAccount: zkAccount,
    });

    const privateTxSingleResult =
      await senderZkPrivateAccount.privateTxSingle(
        zkAccount.value,
        transientZkAccount.address
      );

    if (!privateTxSingleResult.success) {
      return {
        success: false,
        message: privateTxSingleResult.message,
      }
    }

    const {
      scalar: updatedTransientScalar,
      txId,
      updatedAddress: updatedTransientAddress,
    } = privateTxSingleResult.data;

    console.log("txId", txId, "updatedAddess", updatedTransientAddress);

    console.log(
      "transient zkAccount balance =",
      zkAccount.value,
    );

    const {
      success,
      msg: zkBurnMsg,
      zkAccountHex,
    } = await createZkBurnTx({
      signature: privateKey,
      zkAccount: {
        tag: zkAccount.tag,
        address: updatedTransientAddress,
        scalar: updatedTransientScalar,
        isOnChain: true,
        value: zkAccount.value,
        type: "Coin",
      },
      initZkAccountAddress: transientZkAccount.address,
    });

    if (!success || !zkBurnMsg || !zkAccountHex) {
      return {
        success: false,
        message: "Error creating zkBurnTx msg",
      }
    }

    console.log({
      zkAccountHex: zkAccountHex,
      balance: zkAccount.value,
      signature: privateKey,
      initZkAccountAddress: transientZkAccount.address,
    });

    const isAccountValid = await verifyAccount({
      zkAccountHex: zkAccountHex,
      balance: zkAccount.value,
      signature: privateKey,
    });

    console.log("isAccountValid", isAccountValid);

    toast({
      title: "Broadcasting transfer",
      description:
        "Please do not close this page while your BTC is being transferred to your funding account...",
    });

    const txValidMessage = await verifyQuisQuisTransaction({
      tx: zkBurnMsg,
    });

    console.log("txValidMessage", txValidMessage);

    const tradingTxResString = await broadcastTradingTx(
      zkBurnMsg,
      twilightAddress
    );

    console.log("zkBurnMsg tradingTxResString >>"), tradingTxResString;

    const tradingTxRes = safeJSONParse(tradingTxResString as string);

    if (!tradingTxRes.success || Object.hasOwn(tradingTxRes, "error")) {
      toast({
        variant: "error",
        title: "An error has occurred",
        description: "Please try again later.",
      });
      console.error("error broadcasting zkBurnTx msg", tradingTxRes);
      return {
        success: false,
        message: "Error broadcasting zkBurnTx msg",
      }
    }

    console.log("tradingTxRes", tradingTxRes);

    const { mintBurnTradingBtc } =
      twilightproject.nyks.zkos.MessageComposer.withTypeUrl;

    const stargateClient = await chainWallet.getSigningStargateClient();

    console.log({
      btcValue: Long.fromNumber(zkAccount.value),
      encryptScalar: updatedTransientScalar,
      mintOrBurn: false,
      qqAccount: zkAccountHex,
      twilightAddress,
    });

    const mintBurnMsg = mintBurnTradingBtc({
      btcValue: Long.fromNumber(zkAccount.value),
      encryptScalar: updatedTransientScalar,
      mintOrBurn: false,
      qqAccount: zkAccountHex,
      twilightAddress,
    });

    console.log("mintBurnMsg", mintBurnMsg);
    const mintBurnRes = await stargateClient.signAndBroadcast(
      twilightAddress,
      [mintBurnMsg],
      "auto"
    );

    addTransactionHistory({
      date: new Date(),
      from: zkAccount.address,
      fromTag: zkAccount.tag,
      to: twilightAddress,
      toTag: "Funding",
      tx_hash: mintBurnRes.transactionHash,
      type: "Burn",
      value: zkAccount.value,
    });

    removeZkAccount(zkAccount);

    toast({
      title: "Success",
      description: (
        <div className="opacity-90">
          {`Successfully sent ${new BTC("sats", Big(zkAccount.value))
            .convert("BTC")
            .toString()} BTC to the Trading Account.`}
          <Link
            href={`${process.env.NEXT_PUBLIC_EXPLORER_URL as string}/txs/${mintBurnRes.transactionHash}`}
            target={"_blank"}
            className="text-sm underline hover:opacity-100"
          >
            Explorer link
          </Link>
        </div>
      ),
    });

    return {
      success: true,
    }
  }, [toast, privateKey, removeZkAccount, chainWallet]);

  // Memoize the callback functions to prevent unnecessary re-renders
  const handleSettleOrder = useCallback(async (tradeOrder: TradeOrder) => {
    const currentAccount = zkAccounts.find(
      (account) => account.address === tradeOrder.accountAddress
    );

    if (!currentAccount) {
      toast({
        variant: "error",
        title: "Error",
        description: "Error account associated with this order is missing",
      });

      return;
    }

    const transactionHashCondition = (
      txHashResult: Awaited<ReturnType<typeof queryTransactionHashes>>
    ) => {
      if (txHashResult.result) {
        const transactionHashes = txHashResult.result;

        let hasSettled = false;

        transactionHashes.forEach((result) => {
          if (!result.output) {
            return;
          }

          hasSettled = result.order_id === tradeOrder.uuid;
        });

        return hasSettled;
      }
      return false;
    };

    const transactionHashRes = await retry<
      ReturnType<typeof queryTransactionHashes>,
      string
    >(
      queryTransactionHashes,
      30,
      tradeOrder.accountAddress,
      1000,
      transactionHashCondition
    );

    if (!transactionHashRes.success) {
      console.error("cancel order failed to get transaction_hashes");
      toast({
        variant: "error",
        title: "Error",
        description: "Error with cancelling trade order",
      });
      return;
    }

    const output = transactionHashRes.data.result.find(
      (tx) => tx.order_status === "FILLED"
    )?.output || ""

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
        outputMemo: tradeOrder.output || output,
        transactionType: "ORDERTX",
        uuid: tradeOrder.uuid,
        signature: privateKey,
        executionPricePoolshare: 1, // todo: fix for non market order
      });

      console.log("msg", msg);
      toast({
        title: "Closing order",
        description: "Action is being processed...",
      });

      const executeTradeRes = await executeTradeOrder(msg);

      const transactionHashCondition = (
        txHashResult: Awaited<ReturnType<typeof queryTransactionHashes>>
      ) => {
        if (txHashResult.result) {
          const transactionHashes = txHashResult.result;

          let hasSettled = false;
          transactionHashes.forEach((result) => {
            if (result.order_status !== "PENDING") {
              return;
            }

            console.log(result.order_id, tradeOrder.uuid)
            hasSettled =
              result.order_id === tradeOrder.uuid &&
              !result.tx_hash.includes("Error");
          });

          return hasSettled;
        }
        return false;
      };

      const transactionHashRes = await retry<
        ReturnType<typeof queryTransactionHashes>,
        string
      >(
        queryTransactionHashes,
        30,
        tradeOrder.accountAddress,
        1000,
        transactionHashCondition
      );

      if (!transactionHashRes.success) {
        console.error("settling order failed to get transaction_hashes");
        toast({
          variant: "error",
          title: "Error",
          description: "Error with settling trade order",
        });
        return;
      }

      console.log("tx_hashes return", transactionHashRes.data.result);
      // note: we have to make sure chain has settled before requesting balance
      // as input is memo and not yet coin

      const settledTx = transactionHashRes.data.result.find(
        (tx) => tx.order_status === "SETTLED"
      )

      const getZkAccountBalanceResult = await retry<
        ReturnType<typeof getZkAccountBalance>,
        {
          zkAccountAddress: string;
          signature: string;
        }
      >(
        getZkAccountBalance,
        30,
        {
          zkAccountAddress: tradeOrder.accountAddress,
          signature: privateKey,
        },
        1000,
        (result) => {
          if (result.value) return true;

          return false;
        }
      );

      if (!getZkAccountBalanceResult.success) {
        console.error("settling order failed to get balance");
        toast({
          variant: "error",
          title: "Error",
          description: "Error with getting balance after settling order.",
        });
        return;
      }

      const { value: newAccountBalance } = getZkAccountBalanceResult.data;

      if (!newAccountBalance) {
        console.error("settling order failed to get balance", newAccountBalance);
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
        type: "CoinSettled",
      });

      const queryTradeOrderMsg = await createQueryTradeOrderMsg({
        address: tradeOrder.accountAddress,
        orderStatus: "SETTLED",
        signature: privateKey,
      });

      console.log("queryTradeOrderMsg", queryTradeOrderMsg);

      const queryTradeOrderRes = await queryTradeOrder(queryTradeOrderMsg);

      if (!queryTradeOrderRes) {
        throw new Error("Failed to query trade order");
      }

      const traderOrderInfo = queryTradeOrderRes.result;

      console.log("traderOrderInfo", traderOrderInfo);

      updateTrade({
        ...tradeOrder,
        orderStatus: "SETTLED",
        tx_hash: settledTx?.tx_hash || tradeOrder.tx_hash,
        realizedPnl: new Big(traderOrderInfo.unrealized_pnl).toNumber(),
        unrealizedPnl: new Big(traderOrderInfo.unrealized_pnl).toNumber(),
        settlementPrice: new Big(traderOrderInfo.settlement_price).toNumber(),
        positionSize: new Big(traderOrderInfo.positionsize).toNumber(),
        entryNonce: traderOrderInfo.entry_nonce,
        entrySequence: traderOrderInfo.entry_sequence,
        executionPrice: new Big(traderOrderInfo.execution_price).toNumber(),
        initialMargin: new Big(traderOrderInfo.initial_margin).toNumber(),
        liquidationPrice: new Big(traderOrderInfo.liquidation_price).toNumber(),
        exit_nonce: traderOrderInfo.exit_nonce,
        date: dayjs(traderOrderInfo.timestamp).toDate(),
        isOpen: false,
        feeFilled: new Big(traderOrderInfo.fee_filled).toNumber(),
        feeSettled: new Big(traderOrderInfo.fee_settled).toNumber(),
        availableMargin: new Big(traderOrderInfo.available_margin).toNumber(),
        bankruptcyPrice: new Big(traderOrderInfo.bankruptcy_price).toNumber(),
        bankruptcyValue: new Big(traderOrderInfo.bankruptcy_value).toNumber(),
        maintenanceMargin: new Big(traderOrderInfo.maintenance_margin).toNumber(),
      })

      toast({
        title: "Success",
        description: <div className="opacity-90">
          Successfully closed {tradeOrder.orderType.toLowerCase()} order.{" "}
          <Link
            href={`${process.env.NEXT_PUBLIC_EXPLORER_URL as string}/txs/${settledTx?.tx_hash || tradeOrder.tx_hash}`}
            target={"_blank"}
            className="text-sm underline hover:opacity-100"
          >
            Explorer link
          </Link>
        </div>
      });

      console.log("trade order settled", settledTx?.tx_hash);

      // Pass the PnL-adjusted balance so the burn tx uses the correct on-chain
      // value, not the original margin captured before settlement.
      const result = await cleanupTradeOrder(privateKey, {
        ...currentAccount,
        value: newAccountBalance,
      });

      if (!result.success) {
        toast({
          title: "Error with settling trade order",
          description: result.message,
          variant: "error",
        })
        return;
      }

    } catch (err) {
      if (isUserRejection(err)) {
        toast({
          title: "Transaction rejected",
          description: "You declined the transaction in your wallet.",
        });
        return;
      }
      console.error(err);
      toast({
        variant: "error",
        title: "Error",
        description: "Error with settling trade order",
      });
    }
  }, [toast, zkAccounts, privateKey, updateZkAccount, updateTrade, cleanupTradeOrder]);

  const handleCancelOrder = useCallback(async (tradeOrder: TradeOrder) => {
    const currentAccount = zkAccounts.find(
      (account) => account.address === tradeOrder.accountAddress
    );

    if (!currentAccount) {
      toast({
        variant: "error",
        title: "Error",
        description: "Error account associated with this order is missing",
      });

      return;
    }

    try {
      console.log("uuid", tradeOrder.uuid);

      const result = await cancelTradeOrder({
        address: currentAccount.address,
        uuid: tradeOrder.uuid,
        signature: privateKey,
      });

      console.log("cancelResult", result)
      if (typeof (result.result) === "string" && result.result.includes("not cancelable")) {
        toast({
          variant: "error",
          title: "Error",
          description: "You cannot cancel this order",
        });
        return;
      }

      const transactionHashCondition = (
        txHashResult: Awaited<ReturnType<typeof queryTransactionHashes>>
      ) => {
        if (txHashResult.result) {
          const transactionHashes = txHashResult.result;

          let hasSettled = false;
          transactionHashes.forEach((result) => {
            if (result.order_status !== "CANCELLED") {
              console.log(result.order_status)
              return;
            }

            hasSettled =
              result.order_id === tradeOrder.uuid &&
              !result.tx_hash.includes("Error");
          });

          return hasSettled;
        }
        return false;
      };

      const transactionHashRes = await retry<
        ReturnType<typeof queryTransactionHashes>,
        string
      >(
        queryTransactionHashes,
        30,
        tradeOrder.accountAddress,
        1000,
        transactionHashCondition
      );

      if (!transactionHashRes.success) {
        console.error("cancel order failed to get transaction_hashes");
        toast({
          variant: "error",
          title: "Error",
          description: "Error with cancelling trade order",
        });
        return;
      }

      toast({
        title: "Success",
        description: `Successfully cancelled ${tradeOrder.orderType.toLowerCase()} order`,
      });

      const queryTradeOrderMsg = await createQueryTradeOrderMsg({
        address: tradeOrder.accountAddress,
        orderStatus: "CANCELLED",
        signature: privateKey,
      });

      console.log("queryTradeOrderMsg", queryTradeOrderMsg);

      const queryTradeOrderRes = await queryTradeOrder(queryTradeOrderMsg);

      if (!queryTradeOrderRes) {
        throw new Error("Failed to query trade order");
      }

      const traderOrderInfo = queryTradeOrderRes.result;

      console.log("traderOrderInfo", traderOrderInfo);

      updateZkAccount(tradeOrder.accountAddress, {
        ...currentAccount,
        type: "Coin",
      });

      updateTrade({
        ...tradeOrder,
        orderStatus: "CANCELLED",
        orderType: tradeOrder.orderType,
        positionType: tradeOrder.positionType,
        tx_hash: tradeOrder.tx_hash,
        uuid: tradeOrder.uuid,
        output: tradeOrder.output,
        realizedPnl: new Big(traderOrderInfo.unrealized_pnl).toNumber(),
        unrealizedPnl: new Big(traderOrderInfo.unrealized_pnl).toNumber(),
        settlementPrice: new Big(traderOrderInfo.settlement_price).toNumber(),
        positionSize: new Big(traderOrderInfo.positionsize).toNumber(),
        entryNonce: traderOrderInfo.entry_nonce,
        entrySequence: traderOrderInfo.entry_sequence,
        executionPrice: new Big(traderOrderInfo.execution_price).toNumber(),
        initialMargin: new Big(traderOrderInfo.initial_margin).toNumber(),
        liquidationPrice: new Big(traderOrderInfo.liquidation_price).toNumber(),
        exit_nonce: traderOrderInfo.exit_nonce,
        date: dayjs(traderOrderInfo.timestamp).toDate(),
        isOpen: false,
        feeFilled: new Big(traderOrderInfo.fee_filled).toNumber(),
        feeSettled: new Big(traderOrderInfo.fee_settled).toNumber(),
      });

      const cleanupResult = await cleanupTradeOrder(privateKey, currentAccount);

      if (!cleanupResult.success) {
        toast({
          title: "Error with cancelling trade order",
          description: cleanupResult.message,
          variant: "error",
        })
        return;
      }

      toast({
        title: "Success",
        description: "Order has been successfully cancelled",
      });
    } catch (err) {
      if (isUserRejection(err)) {
        toast({
          title: "Transaction rejected",
          description: "You declined the transaction in your wallet.",
        });
        return;
      }
      console.error(err);
      toast({
        variant: "error",
        title: "Error",
        description: "Error with cancelling trade order",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast, zkAccounts, privateKey, updateZkAccount, updateTrade, cleanupTradeOrder]);

  // Create enhanced columns with current price access
  const enhancedColumns = useMemo(() => {
    return myTradesColumns.map(column => {
      if ('accessorKey' in column && column.accessorKey === 'markPrice') {
        return {
          ...column,
          cell: (row: any) => {
            const trade = row.row.original;
            const currentPrice = getCurrentPrice();
            const markPrice = currentPrice || trade.entryPrice;

            return (
              <span className="font-medium">
                ${markPrice.toFixed(2)}
              </span>
            );
          },
        };
      }

      if ('accessorKey' in column && column.accessorKey === 'fee') {
        return {
          ...column,
          cell: (row: any) => {
            const trade = row.row.original;
            const fee = trade.feeFilled + trade.feeSettled;

            return (
              <span className="font-medium">
                {BTC.format(new BTC("sats", Big(fee)).convert("BTC"), "BTC")} BTC
              </span>
            );
          },
        }
      }

      if ('accessorKey' in column && column.accessorKey === 'calculatedUnrealizedPnl') {
        return {
          ...column,
          cell: (row: any) => {
            const trade = row.row.original;
            const isPendingLimit = trade.orderType === "LIMIT" && trade.orderStatus === "PENDING";

            if (isPendingLimit) {
              return <span className="text-xs text-gray-500">—</span>;
            }

            let upnl: number | undefined;
            const currentPrice = getCurrentPrice();
            if (currentPrice && trade.entryPrice) {
              const positionSize = trade.positionSize;
              upnl = calculateUpnl(trade.entryPrice, currentPrice, trade.positionType, positionSize);
            }

            if (upnl === undefined || upnl === null) {
              return <span className="text-xs text-gray-500">—</span>;
            }

            const isPositive = upnl > 0;
            const isNegative = upnl < 0;
            const displayupnl = BTC.format(new BTC("sats", Big(upnl)).convert("BTC"), "BTC")

            return (
              <span
                className={cn(
                  "text-xs font-medium",
                  isPositive && "text-green-medium",
                  isNegative && "text-red",
                  !isPositive && !isNegative && "text-gray-500"
                )}
              >
                {isPositive ? "+" : ""}{displayupnl} BTC
              </span>
            );
          },
        };
      }

      return column;
    });
  }, [getCurrentPrice]);

  const tableData = useMemo(() => {
    return tradeOrders.filter((trade) => trade.isOpen).map((trade) => ({
      ...trade,
      onSettle: () => handleSettleOrder(trade),
      onCancel: () => handleCancelOrder(trade),
    }));
  }, [tradeOrders, handleSettleOrder, handleCancelOrder]);

  return (
    <div className="w-full px-3">
      <MyTradesDataTable
        columns={enhancedColumns}
        data={tableData}
      />
    </div>
  );
};

export default OrderMyTrades;
