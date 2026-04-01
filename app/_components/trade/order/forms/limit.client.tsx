import ConnectWallet from "@/app/_components/layout/connect-wallet.client";
import Button from "@/components/button";
import ExchangeResource from "@/components/exchange-resource";
import FundingTradeButton from "@/components/fund-trade-button";
import { Input } from "@/components/input";
import { Slider } from "@/components/slider";
import { sendTradeOrder } from "@/lib/api/client";
import { queryTradeOrder } from "@/lib/api/relayer";
import {
  queryTransactionHashes,
  isErrorStatus,
  isCancelStatus,
} from "@/lib/api/rest";
import { queryUtxoForAddress } from "@/lib/api/zkos";
import cn from "@/lib/cn";
import { retry } from "@/lib/helpers";
import useGetMarketStats from "@/lib/hooks/useGetMarketStats";
import { useToast } from "@/lib/hooks/useToast";
import { useGrid } from "@/lib/providers/grid";
import { usePriceFeed } from "@/lib/providers/feed";
import { useSessionStore, useSignStatus } from "@/lib/providers/session";
import { useTwilightStore, useTwilightStoreApi } from "@/lib/providers/store";
import BTC from "@/lib/twilight/denoms";
import { usdNumberFormatter } from "@/lib/utils/format";
import { createZkAccountWithBalance, createZkOrder } from "@/lib/twilight/zk";
import { createQueryTradeOrderMsg } from "@/lib/twilight/zkos";
import { ZkAccount } from "@/lib/types";
import { ZkPrivateAccount } from "@/lib/zk/account";
import { masterAccountQueue } from "@/lib/utils/masterAccountQueue";
import {
  assertMasterAccountActionAllowed,
  createPendingMasterAccountRecovery,
  getMasterAccountBlockedMessage,
} from "@/lib/utils/masterAccountRecovery";
import {
  hasUtxoData,
  serializeTxid,
  waitForUtxoUpdate,
} from "@/lib/utils/waitForUtxoUpdate";
import { useWallet } from "@cosmos-kit/react-lite";
import Big from "big.js";
import dayjs from "dayjs";
import { Loader2, Minus, Plus } from "lucide-react";
import Link from "next/link";
import React, {
  SyntheticEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

const PRICE_STEP = 50;
/** Delay before rapid repeat starts (ms). */
const PRICE_REPEAT_INITIAL_DELAY_MS = 450;
/** Interval between repeats while held (ms). */
const PRICE_REPEAT_INTERVAL_MS = 55;
const PRICE_PRESETS = [-3, -2, -1, 1, 2, 3] as const;
const COLLATERAL_STEP_BTC = 0.000001;
const COLLATERAL_STEP_USD = 10;
const COLLATERAL_PRESETS = [25, 50, 75, 100] as const;
const LEVERAGE_PRESETS = [2, 5, 10, 25, 50] as const;

const OrderLimitForm = () => {
  const { width } = useGrid();
  const { toast } = useToast();
  const marketStats = useGetMarketStats();
  const storeApi = useTwilightStoreApi();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [leverage, setLeverage] = useState<string>("5");
  const [percent, setPercent] = useState<number>(0);
  const [btcAmount, setBtcAmount] = useState<string>("");
  const [collateralUnit, setCollateralUnit] = useState<"btc" | "usd">("btc");

  const updatePercent = useCallback((value: number) => {
    const finalValue = Math.max(0, Math.min(value, 100));
    setPercent(finalValue);
  }, []);

  const { getCurrentPrice, subscribe } = usePriceFeed();
  const liveBtcPrice = useSyncExternalStore(
    subscribe,
    getCurrentPrice,
    () => 0
  );
  const storedBtcPrice = useSessionStore((state) => state.price.btcPrice);
  const markPrice = liveBtcPrice || storedBtcPrice;

  const [orderPrice, setOrderPrice] = useState(
    markPrice ? Math.round(markPrice * 100) / 100 : 0
  );

  useEffect(() => {
    if (markPrice > 0 && orderPrice === 0)
      setOrderPrice(Math.round(markPrice * 100) / 100);
  }, [markPrice]);

  const orderSats = useMemo(() => {
    if (!btcAmount) return 0;
    try {
      return Math.floor(
        new BTC("BTC", Big(btcAmount)).convert("sats").toNumber()
      );
    } catch {
      return 0;
    }
  }, [btcAmount]);

  const usdAmount = useMemo(() => {
    if (!btcAmount || !markPrice || markPrice <= 0) return "";
    const btc = parseFloat(btcAmount);
    if (!Number.isFinite(btc) || btc <= 0) return "";
    return Big(btc).mul(markPrice).toFixed(2);
  }, [btcAmount, markPrice]);

  const positionSize = useMemo(() => {
    if (!orderPrice || !leverage || !orderSats) return "0.00";
    try {
      const btcValue = new BTC("sats", Big(orderSats))
        .convert("BTC")
        .toNumber();
      const psize = Big(btcValue)
        .mul(orderPrice)
        .mul(Big(leverage || "1"));
      return usdNumberFormatter.format(Number(psize.toFixed(2)));
    } catch {
      return "0.00";
    }
  }, [orderPrice, leverage, orderSats]);

  const positionSizeBtc = useMemo(() => {
    if (!orderSats || !leverage) return "0.000000";
    try {
      const totalSats = Big(orderSats).mul(Big(leverage || "1"));
      const btc = new BTC("sats", totalSats).convert("BTC").toNumber();
      return Number(btc.toFixed(6)).toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 6,
      });
    } catch {
      return "0.000000";
    }
  }, [orderSats, leverage]);

  const liquidationPrices = useMemo(() => {
    if (
      !orderPrice ||
      !leverage ||
      !orderSats ||
      orderPrice <= 0 ||
      orderSats <= 0 ||
      Big(leverage || "0").lte(0)
    ) {
      return { long: "0.00", short: "0.00" };
    }
    try {
      const entryPrice = Big(orderPrice);
      const leverageBig = Big(leverage || "1");
      const mmRate = 0.004; // 0.4% - matches backend maintenancemargin

      // Inverse perps: liqLong = entry × leverage × (1 + mmRate) / (leverage + 1)
      const liqLong = entryPrice
        .mul(leverageBig)
        .mul(Big(1).plus(mmRate))
        .div(leverageBig.plus(1));
      const liqLongNum = Number(liqLong.toFixed(2));

      // Inverse perps: liqShort = entry × leverage × (1 - mmRate) / (leverage - 1)
      // At leverage 1, denominator is 0 → infinite (fully collateralized, no liquidation)
      const denomShort = leverageBig.minus(1);
      let shortDisplay = "0.00";
      if (denomShort.gt(0)) {
        const liqShort = entryPrice
          .mul(leverageBig)
          .mul(Big(1).minus(mmRate))
          .div(denomShort);
        const liqShortNum = Number(liqShort.toFixed(2));
        const entryPriceNum = Number(entryPrice.toFixed(2));
        shortDisplay =
          liqShortNum <= entryPriceNum || !Number.isFinite(liqShortNum)
            ? "0.00"
            : usdNumberFormatter.format(liqShortNum);
      } else {
        // Leverage 1 short: no liquidation (infinite liq price)
        shortDisplay = "—";
      }

      const entryPriceNum = Number(entryPrice.toFixed(2));

      return {
        long:
          liqLongNum <= 0 ||
          liqLongNum >= entryPriceNum ||
          !Number.isFinite(liqLongNum)
            ? "0.00"
            : usdNumberFormatter.format(liqLongNum),
        short: shortDisplay,
      };
    } catch {
      return { long: "0.00", short: "0.00" };
    }
  }, [orderPrice, leverage, orderSats]);

  const { status, mainWallet } = useWallet();
  const privateKey = useSessionStore((state) => state.privateKey);
  const { retrySign } = useSignStatus();
  const updateZkAccount = useTwilightStore((state) => state.zk.updateZkAccount);
  const masterAccountBlocked = useTwilightStore(
    (state) => state.zk.masterAccountBlocked
  );
  const masterAccountBlockReason = useTwilightStore(
    (state) => state.zk.masterAccountBlockReason
  );
  const setMasterAccountRecovery = useTwilightStore(
    (state) => state.zk.setMasterAccountRecovery
  );
  const addTrade = useTwilightStore((state) => state.trade.addTrade);
  const addTradeHistory = useTwilightStore(
    (state) => state.trade_history.addTrade
  );
  const zkAccounts = useTwilightStore((state) => state.zk.zkAccounts);
  const tradingAccount = zkAccounts.find((account) => account.tag === "main");
  const tradingAccountBalance = tradingAccount?.value || 0;
  const tradingAccountBalanceString = new BTC(
    "sats",
    Big(tradingAccountBalance)
  )
    .convert("BTC")
    .toFixed(8);

  const addZkAccount = useTwilightStore((state) => state.zk.addZkAccount);
  const optInLeaderboard = useTwilightStore((state) => state.optInLeaderboard);
  const addTransactionHistory = useTwilightStore(
    (state) => state.history.addTransaction
  );

  const buyWouldExecuteImmediately =
    markPrice > 0 && orderPrice > 0 && orderPrice >= markPrice;
  const sellWouldExecuteImmediately =
    markPrice > 0 && orderPrice > 0 && orderPrice <= markPrice;

  const buyLabel = buyWouldExecuteImmediately ? "Buy (MKT)" : "Buy";
  const sellLabel = sellWouldExecuteImmediately ? "Sell (MKT)" : "Sell";

  const applyPricePreset = useCallback(
    (pct: number) => {
      if (markPrice <= 0) return;
      const newPrice = markPrice * (1 + pct / 100);
      setOrderPrice(Math.max(0.01, Math.round(newPrice * 100) / 100));
    },
    [markPrice]
  );

  const adjustPrice = useCallback((delta: number) => {
    setOrderPrice((p) => Math.max(0.01, Math.round((p + delta) * 100) / 100));
  }, []);

  const priceRepeatRef = useRef<{
    timeoutId: ReturnType<typeof setTimeout> | null;
    intervalId: ReturnType<typeof setInterval> | null;
  }>({ timeoutId: null, intervalId: null });

  const clearPriceRepeat = useCallback(() => {
    const t = priceRepeatRef.current;
    if (t.timeoutId != null) {
      clearTimeout(t.timeoutId);
      t.timeoutId = null;
    }
    if (t.intervalId != null) {
      clearInterval(t.intervalId);
      t.intervalId = null;
    }
  }, []);

  const startPriceRepeat = useCallback(
    (delta: number) => {
      clearPriceRepeat();
      adjustPrice(delta);
      priceRepeatRef.current.timeoutId = setTimeout(() => {
        priceRepeatRef.current.timeoutId = null;
        priceRepeatRef.current.intervalId = setInterval(() => {
          adjustPrice(delta);
        }, PRICE_REPEAT_INTERVAL_MS);
      }, PRICE_REPEAT_INITIAL_DELAY_MS);
    },
    [adjustPrice, clearPriceRepeat]
  );

  useEffect(() => () => clearPriceRepeat(), [clearPriceRepeat]);

  const adjustCollateralBtc = useCallback(
    (delta: number) => {
      const current = parseFloat(btcAmount || "0") || 0;
      const maxBtc = parseFloat(tradingAccountBalanceString || "0");
      const newBtc = Math.max(0, Math.min(current + delta, maxBtc));
      setBtcAmount(newBtc > 0 ? newBtc.toFixed(8) : "");
      if (tradingAccountBalance > 0 && maxBtc > 0) {
        updatePercent((newBtc / maxBtc) * 100);
      }
    },
    [
      btcAmount,
      tradingAccountBalance,
      tradingAccountBalanceString,
      updatePercent,
    ]
  );

  const adjustCollateralUsd = useCallback(
    (delta: number) => {
      if (!markPrice || markPrice <= 0) return;
      const currentBtc = parseFloat(btcAmount || "0") || 0;
      const btcDelta = delta / markPrice;
      const maxBtc = parseFloat(tradingAccountBalanceString || "0");
      const newBtc = Math.max(0, Math.min(currentBtc + btcDelta, maxBtc));
      setBtcAmount(newBtc > 0 ? newBtc.toFixed(8) : "");
      if (tradingAccountBalance > 0 && maxBtc > 0) {
        updatePercent((newBtc / maxBtc) * 100);
      }
    },
    [
      btcAmount,
      markPrice,
      tradingAccountBalance,
      tradingAccountBalanceString,
      updatePercent,
    ]
  );

  const adjustCollateral = useCallback(
    (delta: number) => {
      if (collateralUnit === "btc") {
        adjustCollateralBtc(delta);
      } else {
        adjustCollateralUsd(delta);
      }
    },
    [collateralUnit, adjustCollateralBtc, adjustCollateralUsd]
  );

  const collateralRepeatRef = useRef<{
    timeoutId: ReturnType<typeof setTimeout> | null;
    intervalId: ReturnType<typeof setInterval> | null;
  }>({ timeoutId: null, intervalId: null });

  const collateralStepRef = useRef<number>(COLLATERAL_STEP_BTC);

  const clearCollateralRepeat = useCallback(() => {
    const t = collateralRepeatRef.current;
    if (t.timeoutId != null) {
      clearTimeout(t.timeoutId);
      t.timeoutId = null;
    }
    if (t.intervalId != null) {
      clearInterval(t.intervalId);
      t.intervalId = null;
    }
  }, []);

  const startCollateralRepeat = useCallback(
    (sign: 1 | -1) => {
      clearCollateralRepeat();
      adjustCollateral(sign * collateralStepRef.current);
      collateralRepeatRef.current.timeoutId = setTimeout(() => {
        collateralRepeatRef.current.timeoutId = null;
        collateralRepeatRef.current.intervalId = setInterval(() => {
          adjustCollateral(sign * collateralStepRef.current);
        }, PRICE_REPEAT_INTERVAL_MS);
      }, PRICE_REPEAT_INITIAL_DELAY_MS);
    },
    [adjustCollateral, clearCollateralRepeat]
  );

  useEffect(() => () => clearCollateralRepeat(), [clearCollateralRepeat]);

  async function submitLimitOrder(
    e: SyntheticEvent<HTMLFormElement, SubmitEvent>
  ) {
    e.preventDefault();

    if (!privateKey) {
      await retrySign();
      return;
    }

    const chainWallet = mainWallet?.getChainWallet("nyks");

    if (!chainWallet) {
      toast({
        title: "Wallet is not connected",
        description: "Please connect your wallet to deposit.",
      });
      return;
    }

    if (masterAccountBlocked) {
      toast({
        variant: "error",
        title: "Trading account recovery in progress",
        description: getMasterAccountBlockedMessage(masterAccountBlockReason),
      });
      return;
    }

    if (tradingAccountBalance <= 0) {
      toast({
        variant: "error",
        title: "No funds available",
        description:
          "Please transfer funds to your trading account before placing an order.",
      });
      return;
    }

    const twilightAddress = chainWallet.address;
    if (!twilightAddress || !tradingAccount) return;

    if (!btcAmount || Big(btcAmount).lte(0)) {
      toast({
        variant: "error",
        title: "Invalid amount",
        description: "Please enter an amount to trade.",
      });
      return;
    }

    try {
      const submitter = e.nativeEvent.submitter as HTMLButtonElement;
      const action = submitter.value as "sell" | "buy";

      const btcAmountInSats = Math.floor(
        new BTC("BTC", Big(btcAmount)).convert("sats").toNumber()
      );

      if (tradingAccountBalance < btcAmountInSats) {
        toast({
          variant: "error",
          title: "Insufficient funds",
          description:
            "You do not have enough funds to submit this trade order",
        });
        return;
      }

      if (btcAmountInSats < 1000) {
        toast({
          variant: "error",
          title: "Invalid amount",
          description: "Please enter an amount greater than 0.00001 BTC.",
        });
        return;
      }

      if (orderPrice <= 0) {
        throw "Unable to create limit order with price lower than 0";
      }

      const leverageVal = parseInt(leverage || "1", 10);
      const positionType = action === "sell" ? "SHORT" : "LONG";

      const orderValue = btcAmountInSats * leverageVal;
      const maxPosition =
        positionType === "LONG"
          ? marketStats.data?.max_long_btc
          : marketStats.data?.max_short_btc;
      if (maxPosition !== undefined && orderValue > maxPosition) {
        toast({
          variant: "error",
          title: "Order exceeds maximum position size",
          description: `Maximum ${positionType.toLowerCase()} position size is ${BTC.formatSatsAuto(maxPosition).value} ${BTC.formatSatsAuto(maxPosition).denom}.`,
        });
        return;
      }

      setIsSubmitting(true);
      toast({
        title: "Placing order",
        description: "Order is being placed, please do not close this page.",
      });

      const { account: newTradingAccount } = await createZkAccountWithBalance({
        tag: "limit",
        balance: btcAmountInSats,
        signature: privateKey,
      });

      let queueResult: { newZkAccount: ZkAccount; txId: string };
      try {
        queueResult = await masterAccountQueue.enqueue(async () => {
          const state = storeApi.getState();
          assertMasterAccountActionAllowed({
            masterAccountBlocked: state.zk.masterAccountBlocked,
            masterAccountBlockReason: state.zk.masterAccountBlockReason,
          });

          const currentTradingAccount = state.zk.zkAccounts.find(
            (a) => a.tag === "main"
          );

          if (
            !currentTradingAccount ||
            !currentTradingAccount.isOnChain ||
            !currentTradingAccount.value
          ) {
            throw new Error("Master trading account not found or not on-chain");
          }

          if ((currentTradingAccount.value ?? 0) < btcAmountInSats) {
            throw new Error("Insufficient funds in master trading account");
          }

          const utxoBefore = await queryUtxoForAddress(
            currentTradingAccount.address
          );
          const previousTxid = hasUtxoData(utxoBefore)
            ? serializeTxid(utxoBefore.txid)
            : "";

          const senderZkPrivateAccount = await ZkPrivateAccount.create({
            signature: privateKey,
            existingAccount: currentTradingAccount,
          });

          const privateTxSingleResult =
            await senderZkPrivateAccount.privateTxSingle(
              btcAmountInSats,
              newTradingAccount.address
            );

          if (!privateTxSingleResult.success) {
            throw new Error(privateTxSingleResult.message);
          }

          const {
            txId,
            scalar: updatedTradingAccountScalar,
            updatedAddress: updatedTradingAccountAddress,
          } = privateTxSingleResult.data;

          const newZkAccount: ZkAccount = {
            scalar: updatedTradingAccountScalar,
            type: "Coin",
            address: updatedTradingAccountAddress,
            tag: `BTC ${action} ${newTradingAccount.address.slice(0, 6)}`,
            isOnChain: true,
            value: btcAmountInSats,
            createdAt: dayjs().unix(),
          };

          const utxoWait = await waitForUtxoUpdate(
            senderZkPrivateAccount.get().address,
            previousTxid
          );
          if (!utxoWait.success) {
            updateZkAccount(currentTradingAccount.address, {
              ...currentTradingAccount,
              address: senderZkPrivateAccount.get().address,
              scalar: senderZkPrivateAccount.get().scalar,
              value: senderZkPrivateAccount.get().value,
              isOnChain: senderZkPrivateAccount.get().isOnChain,
            });
            addZkAccount(newZkAccount);
            addTransactionHistory({
              date: new Date(),
              from: currentTradingAccount.address,
              fromTag: "Primary Trading Account",
              to: updatedTradingAccountAddress,
              toTag: newZkAccount.tag,
              tx_hash: txId,
              type: "Transfer",
              value: btcAmountInSats,
            });
            setMasterAccountRecovery(
              createPendingMasterAccountRecovery({
                address: senderZkPrivateAccount.get().address,
                scalar: senderZkPrivateAccount.get().scalar,
                value: senderZkPrivateAccount.get().value,
                source: "limit order funding transfer",
                txId,
              })
            );
            throw new Error(
              "Trading account recovery is in progress after a delayed UTXO update. Your funds remain visible locally. Please wait for recovery to finish before retrying."
            );
          }

          addZkAccount(newZkAccount);

          updateZkAccount(currentTradingAccount.address, {
            ...currentTradingAccount,
            address: senderZkPrivateAccount.get().address,
            scalar: senderZkPrivateAccount.get().scalar,
            value: senderZkPrivateAccount.get().value,
            isOnChain: senderZkPrivateAccount.get().isOnChain,
          });

          addTransactionHistory({
            date: new Date(),
            from: currentTradingAccount.address,
            fromTag: "Primary Trading Account",
            to: updatedTradingAccountAddress,
            toTag: newZkAccount.tag,
            tx_hash: txId,
            type: "Transfer",
            value: btcAmountInSats,
          });

          return { newZkAccount, txId };
        });
      } catch (err) {
        console.error("masterAccountQueue task failed:", err);
        toast({
          title: "Error with submitting trade order",
          description:
            err instanceof Error
              ? err.message
              : "An error occurred when transferring funds from the trading account.",
          variant: "error",
        });
        return;
      }

      const { newZkAccount } = queueResult;
      const leverageNum = parseInt(leverage || "1", 10);

      const { success, msg } = await createZkOrder({
        leverage: leverageNum,
        orderType: "LIMIT",
        positionType,
        signature: privateKey,
        timebounds: 1,
        zkAccount: newZkAccount as ZkAccount,
        value: btcAmountInSats,
        entryPrice: orderPrice,
      });

      if (!success || !msg) throw "Error with creating limit order";

      const data = await sendTradeOrder(
        msg,
        optInLeaderboard ? twilightAddress : undefined
      );
      if (!data.result || !data.result.id_key)
        throw "Error with creating limit order";

      const transactionHashCondition = (
        txHashResult: Awaited<ReturnType<typeof queryTransactionHashes>>
      ) => {
        return !!txHashResult.result?.find(
          (r) =>
            !isErrorStatus(r.order_status) && !isCancelStatus(r.order_status)
        );
      };

      const transactionHashFailCondition = (
        txHashResult: Awaited<ReturnType<typeof queryTransactionHashes>>
      ) => {
        return (
          txHashResult.result?.some(
            (r) =>
              isCancelStatus(r.order_status) || isErrorStatus(r.order_status)
          ) ?? false
        );
      };

      const transactionHashRes = await retry(
        queryTransactionHashes,
        30,
        newZkAccount.address,
        1000,
        transactionHashCondition,
        transactionHashFailCondition
      );

      if (!transactionHashRes.success) {
        toast({
          variant: "error",
          title: transactionHashRes.cancelled
            ? "Order request denied"
            : "Error",
          description: transactionHashRes.cancelled
            ? "Your order request was denied by the relayer. Your funds remain in your account."
            : "Unable to get tx hash of order",
        });
        return;
      }

      const orderData = transactionHashRes.data.result.find(
        (r) => !isErrorStatus(r.order_status) && !isCancelStatus(r.order_status)
      );

      if (!orderData) {
        toast({
          variant: "error",
          title: "Error",
          description: "Unable to get tx hash of order",
        });
        return;
      }

      const queryTradeOrderRes = await queryTradeOrder(
        await createQueryTradeOrderMsg({
          address: newZkAccount.address,
          orderStatus: orderData.order_status,
          signature: privateKey,
        })
      );

      if (!queryTradeOrderRes) throw new Error("Failed to query trade order");

      const traderOrderInfo = queryTradeOrderRes.result;
      const newTradeData = {
        accountAddress: newZkAccount.address,
        orderStatus: orderData.order_status,
        positionType,
        orderType: orderData.order_type,
        tx_hash: orderData.order_status === "PENDING" ? "" : orderData.tx_hash,
        uuid: orderData.order_id,
        value: btcAmountInSats,
        output: orderData.output ?? undefined,
        entryPrice: new Big(traderOrderInfo.entryprice).toNumber(),
        leverage: leverageNum,
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
        eventSource: "transaction_hashes" as const,
        eventStatus: orderData.order_status,
        request_id: orderData.request_id,
        reason: orderData.reason,
        old_price: orderData.old_price,
        new_price: orderData.new_price,
        priceKind: "NONE" as const,
        displayPrice: null,
        displayPriceBefore: null,
        displayPriceAfter: null,
        eventTimestamp: orderData.datetime
          ? new Date(orderData.datetime)
          : undefined,
        idempotency_key: `${orderData.order_id}|${orderData.order_status}|${orderData.request_id || "NO_REQUEST_ID"}`,
      };

      addTrade(newTradeData);
      addTradeHistory(newTradeData);

      updateZkAccount(newZkAccount.address, { ...newZkAccount, type: "Memo" });

      toast({
        title: "Order placed successfully",
        description: (
          <div className="opacity-90">
            Successfully placed limit order.{" "}
            {orderData.tx_hash && (
              <Link
                href={`${process.env.NEXT_PUBLIC_EXPLORER_URL as string}/txs/${orderData.tx_hash}`}
                target="_blank"
                className="text-sm underline hover:opacity-100"
              >
                Explorer link
              </Link>
            )}
          </div>
        ),
      });

      setLeverage("5");
      setPercent(0);
      setBtcAmount("");
      setOrderPrice(markPrice ? Math.round(markPrice * 100) / 100 : 0);
    } catch (err) {
      if (typeof err === "string") {
        toast({
          variant: "error",
          title: "Error creating limit order",
          description: err,
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  const primaryValue = collateralUnit === "btc" ? btcAmount : usdAmount;
  const secondaryRef =
    collateralUnit === "btc"
      ? markPrice > 0 && usdAmount
        ? `≈ $${usdNumberFormatter.format(parseFloat(usdAmount))}`
        : null
      : btcAmount
        ? `≈ ${btcAmount} BTC`
        : null;

  const collateralStep =
    collateralUnit === "btc" ? COLLATERAL_STEP_BTC : COLLATERAL_STEP_USD;
  collateralStepRef.current = collateralStep;

  const marginStepDisabled =
    !tradingAccountBalance || (collateralUnit === "usd" && !markPrice);

  return (
    <form
      onSubmit={submitLimitOrder}
      className="flex flex-col gap-2 px-3 py-2.5"
    >
      {status === "Connected" && !tradingAccountBalance && (
        <div className="rounded-md border border-outline bg-theme/5 px-3 py-2.5">
          <p className="text-sm text-primary/90">
            Add funds to your trading account to start trading.
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <FundingTradeButton type="large" defaultTransferType="fund" />
            <Link
              href="/deposit"
              className="text-xs text-theme underline hover:opacity-80"
            >
              Deposit to Funding
            </Link>
          </div>
        </div>
      )}
      {/* 1. Header / Account Context */}
      <div className="flex items-baseline justify-between gap-2">
        <span
          className={cn("text-sm text-primary/60", width < 350 && "text-xs")}
        >
          Available:
        </span>
        <span className="text-sm font-medium tabular-nums">
          {tradingAccountBalanceString} BTC
          {markPrice > 0 && (
            <span className="text-primary/70">
              {" "}
              ($
              {usdNumberFormatter.format(
                parseFloat(tradingAccountBalanceString || "0") * markPrice
              )}
              )
            </span>
          )}
        </span>
      </div>

      {/* 2. Order Price — Limit only */}
      <div className="space-y-0.5">
        <div className="flex items-center justify-between">
          <label
            htmlFor="input-order-price"
            className={cn(
              "text-sm font-medium text-primary/90",
              width < 350 && "text-xs"
            )}
          >
            Order Price
          </label>
          {markPrice > 0 && (
            <span className="flex items-baseline gap-1 text-sm text-primary/60">
              <span>Mark:</span>
              <span className="font-medium tabular-nums text-primary">
                ${usdNumberFormatter.format(markPrice)}
              </span>
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-primary/50">From Mark</span>
          {PRICE_PRESETS.map((pct) => (
            <button
              key={pct}
              type="button"
              onClick={() => applyPricePreset(pct)}
              disabled={!tradingAccountBalance || markPrice <= 0}
              className="rounded border border-outline px-1.5 py-0.5 text-[10px] font-medium transition-colors hover:border-theme/30 hover:bg-theme/10 disabled:opacity-40"
            >
              {pct > 0 ? "+" : ""}
              {pct}%
            </button>
          ))}
        </div>
        {/* Mobile: [−] [input + Mark] [+] */}
        <div className="flex items-stretch gap-2 md:hidden">
          <button
            type="button"
            disabled={!tradingAccountBalance}
            onPointerDown={(e) => {
              if (!tradingAccountBalance || e.button !== 0) return;
              e.preventDefault();
              e.currentTarget.setPointerCapture(e.pointerId);
              startPriceRepeat(-PRICE_STEP);
            }}
            onPointerUp={clearPriceRepeat}
            onPointerCancel={clearPriceRepeat}
            onLostPointerCapture={clearPriceRepeat}
            className="flex h-12 w-12 shrink-0 touch-manipulation select-none items-center justify-center rounded-md border border-outline text-primary/70 transition-colors hover:bg-theme/10 hover:text-primary disabled:opacity-40"
          >
            <Minus className="h-4 w-4" />
          </button>
          <div className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden rounded-md border border-outline bg-transparent px-3 shadow-sm focus-within:ring-1 focus-within:ring-primary">
            <Input
              id="input-order-price-mobile"
              type="text"
              value={orderPrice > 0 ? orderPrice.toFixed(2) : ""}
              onChange={(e) => {
                const v = e.target.value.replace(/[^\d.]/g, "");
                const n = parseFloat(v);
                if (!Number.isNaN(n) && n >= 0) setOrderPrice(n);
                else if (v === "") setOrderPrice(0);
              }}
              className="h-12 min-w-0 flex-1 border-0 bg-transparent text-center text-base tabular-nums shadow-none focus-visible:ring-0"
              disabled={!tradingAccountBalance}
            />
            <button
              type="button"
              onClick={() =>
                markPrice > 0 &&
                setOrderPrice(Math.round(markPrice * 100) / 100)
              }
              disabled={!tradingAccountBalance || markPrice <= 0}
              className="shrink-0 text-xs font-medium text-theme transition-colors hover:opacity-80 disabled:opacity-40"
            >
              Mark
            </button>
          </div>
          <button
            type="button"
            disabled={!tradingAccountBalance}
            onPointerDown={(e) => {
              if (!tradingAccountBalance || e.button !== 0) return;
              e.preventDefault();
              e.currentTarget.setPointerCapture(e.pointerId);
              startPriceRepeat(PRICE_STEP);
            }}
            onPointerUp={clearPriceRepeat}
            onPointerCancel={clearPriceRepeat}
            onLostPointerCapture={clearPriceRepeat}
            className="flex h-12 w-12 shrink-0 touch-manipulation select-none items-center justify-center rounded-md border border-outline text-primary/70 transition-colors hover:bg-theme/10 hover:text-primary disabled:opacity-40"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        {/* Desktop: original stacked stepper layout */}
        <div className="hidden items-stretch gap-0 overflow-hidden rounded-md border border-outline bg-transparent shadow-sm focus-within:ring-1 focus-within:ring-primary md:flex">
          <div className="flex min-w-0 flex-1 items-center gap-1 px-2 py-1">
            <Input
              id="input-order-price"
              type="text"
              value={orderPrice > 0 ? orderPrice.toFixed(2) : ""}
              onChange={(e) => {
                const v = e.target.value.replace(/[^\d.]/g, "");
                const n = parseFloat(v);
                if (!Number.isNaN(n) && n >= 0) setOrderPrice(n);
                else if (v === "") setOrderPrice(0);
              }}
              className="h-6 min-w-0 flex-1 border-0 bg-transparent text-base tabular-nums shadow-none focus-visible:ring-0"
              disabled={!tradingAccountBalance}
            />
            <button
              type="button"
              onClick={() =>
                markPrice > 0 &&
                setOrderPrice(Math.round(markPrice * 100) / 100)
              }
              disabled={!tradingAccountBalance || markPrice <= 0}
              className="shrink-0 text-xs font-medium text-theme transition-colors hover:opacity-80 disabled:opacity-40"
            >
              Mark
            </button>
          </div>
          <div className="flex flex-col border-l border-outline">
            <button
              type="button"
              disabled={!tradingAccountBalance}
              onPointerDown={(e) => {
                if (!tradingAccountBalance || e.button !== 0) return;
                e.preventDefault();
                e.currentTarget.setPointerCapture(e.pointerId);
                startPriceRepeat(PRICE_STEP);
              }}
              onPointerUp={clearPriceRepeat}
              onPointerCancel={clearPriceRepeat}
              onLostPointerCapture={clearPriceRepeat}
              className="flex h-4 w-8 shrink-0 touch-manipulation select-none items-center justify-center text-primary/70 transition-colors hover:bg-theme/10 hover:text-primary disabled:opacity-40"
            >
              <Plus className="h-3 w-3" />
            </button>
            <button
              type="button"
              disabled={!tradingAccountBalance}
              onPointerDown={(e) => {
                if (!tradingAccountBalance || e.button !== 0) return;
                e.preventDefault();
                e.currentTarget.setPointerCapture(e.pointerId);
                startPriceRepeat(-PRICE_STEP);
              }}
              onPointerUp={clearPriceRepeat}
              onPointerCancel={clearPriceRepeat}
              onLostPointerCapture={clearPriceRepeat}
              className="flex h-4 w-8 shrink-0 touch-manipulation select-none items-center justify-center text-primary/70 transition-colors hover:bg-theme/10 hover:text-primary disabled:opacity-40"
            >
              <Minus className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>

      {/* 3. Margin Amount */}
      <div className="space-y-0.5">
        <label
          className={cn(
            "block text-sm font-medium text-primary/90",
            width < 350 && "text-xs"
          )}
        >
          Margin Amount
        </label>
        {/* Mobile: [−] [input + toggle] [+] */}
        <div className="flex items-stretch gap-2 md:hidden">
          <button
            type="button"
            disabled={marginStepDisabled}
            onPointerDown={(e) => {
              if (marginStepDisabled || e.button !== 0) return;
              e.preventDefault();
              e.currentTarget.setPointerCapture(e.pointerId);
              startCollateralRepeat(-1);
            }}
            onPointerUp={clearCollateralRepeat}
            onPointerCancel={clearCollateralRepeat}
            onLostPointerCapture={clearCollateralRepeat}
            className="flex h-12 w-12 shrink-0 touch-manipulation select-none items-center justify-center rounded-md border border-outline text-primary/70 transition-colors hover:bg-theme/10 hover:text-primary disabled:opacity-40"
          >
            <Minus className="h-4 w-4" />
          </button>
          <div className="flex min-w-0 flex-1 overflow-hidden rounded-md border border-outline bg-transparent shadow-sm focus-within:ring-1 focus-within:ring-primary">
            <div className="flex min-w-0 flex-1 flex-col justify-center px-3 py-2">
              <Input
                type="text"
                inputMode="decimal"
                placeholder="0"
                value={primaryValue}
                onChange={(e) => {
                  const v = e.target.value.replace(/[^\d.]/g, "");
                  if (!v) {
                    setBtcAmount("");
                    setPercent(0);
                    return;
                  }
                  const n = parseFloat(v);
                  if (!Number.isNaN(n) && n >= 0) {
                    if (collateralUnit === "btc") {
                      setBtcAmount(v);
                      if (tradingAccountBalance > 0) {
                        const maxBtc = parseFloat(tradingAccountBalanceString || "0");
                        updatePercent((n / maxBtc) * 100);
                      }
                    } else {
                      if (markPrice > 0) {
                        const btc = n / markPrice;
                        setBtcAmount(btc.toFixed(8));
                        if (tradingAccountBalance > 0) {
                          const maxBtc = parseFloat(tradingAccountBalanceString || "0");
                          updatePercent((btc / maxBtc) * 100);
                        }
                      }
                    }
                  }
                }}
                className="h-auto min-h-0 w-full border-0 bg-transparent p-0 text-base font-medium tabular-nums shadow-none focus-visible:ring-0"
                disabled={!tradingAccountBalance}
              />
              {secondaryRef && (
                <span className="text-xs text-primary/50">{secondaryRef}</span>
              )}
            </div>
            <div className="flex flex-col border-l border-outline">
              <button
                type="button"
                onClick={() => setCollateralUnit("btc")}
                className={cn(
                  "flex-1 px-2 text-[10px] font-medium transition-colors",
                  collateralUnit === "btc"
                    ? "bg-theme/20 text-theme"
                    : "text-primary/50 hover:text-primary/80"
                )}
              >
                BTC
              </button>
              <button
                type="button"
                onClick={() => setCollateralUnit("usd")}
                className={cn(
                  "flex-1 px-2 text-[10px] font-medium transition-colors",
                  collateralUnit === "usd"
                    ? "bg-theme/20 text-theme"
                    : "text-primary/50 hover:text-primary/80"
                )}
              >
                USD
              </button>
            </div>
          </div>
          <button
            type="button"
            disabled={marginStepDisabled}
            onPointerDown={(e) => {
              if (marginStepDisabled || e.button !== 0) return;
              e.preventDefault();
              e.currentTarget.setPointerCapture(e.pointerId);
              startCollateralRepeat(1);
            }}
            onPointerUp={clearCollateralRepeat}
            onPointerCancel={clearCollateralRepeat}
            onLostPointerCapture={clearCollateralRepeat}
            className="flex h-12 w-12 shrink-0 touch-manipulation select-none items-center justify-center rounded-md border border-outline text-primary/70 transition-colors hover:bg-theme/10 hover:text-primary disabled:opacity-40"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        {/* Desktop: original stacked stepper layout */}
        <div className="hidden items-stretch gap-0 overflow-hidden rounded-md border border-outline bg-transparent shadow-sm focus-within:ring-1 focus-within:ring-primary md:flex">
          <div className="flex min-w-0 flex-1 flex-col justify-center px-2 py-1">
            <Input
              type="text"
              inputMode="decimal"
              placeholder="0"
              value={primaryValue}
              onChange={(e) => {
                const v = e.target.value.replace(/[^\d.]/g, "");
                if (!v) {
                  setBtcAmount("");
                  setPercent(0);
                  return;
                }
                const n = parseFloat(v);
                if (!Number.isNaN(n) && n >= 0) {
                  if (collateralUnit === "btc") {
                    setBtcAmount(v);
                    if (tradingAccountBalance > 0) {
                      const maxBtc = parseFloat(
                        tradingAccountBalanceString || "0"
                      );
                      updatePercent((n / maxBtc) * 100);
                    }
                  } else {
                    if (markPrice > 0) {
                      const btc = n / markPrice;
                      setBtcAmount(btc.toFixed(8));
                      if (tradingAccountBalance > 0) {
                        const maxBtc = parseFloat(
                          tradingAccountBalanceString || "0"
                        );
                        updatePercent((btc / maxBtc) * 100);
                      }
                    }
                  }
                }
              }}
              className="h-auto min-h-0 w-full border-0 bg-transparent p-0 text-base font-medium tabular-nums shadow-none focus-visible:ring-0"
              disabled={!tradingAccountBalance}
            />
            {secondaryRef && (
              <span className="text-xs text-primary/50">{secondaryRef}</span>
            )}
          </div>
          <div className="flex flex-col border-l border-outline">
            <button
              type="button"
              disabled={marginStepDisabled}
              onPointerDown={(e) => {
                if (marginStepDisabled || e.button !== 0) return;
                e.preventDefault();
                e.currentTarget.setPointerCapture(e.pointerId);
                startCollateralRepeat(1);
              }}
              onPointerUp={clearCollateralRepeat}
              onPointerCancel={clearCollateralRepeat}
              onLostPointerCapture={clearCollateralRepeat}
              className="flex h-4 w-8 shrink-0 touch-manipulation select-none items-center justify-center text-primary/70 transition-colors hover:bg-theme/10 hover:text-primary disabled:opacity-40"
            >
              <Plus className="h-3 w-3" />
            </button>
            <button
              type="button"
              disabled={marginStepDisabled}
              onPointerDown={(e) => {
                if (marginStepDisabled || e.button !== 0) return;
                e.preventDefault();
                e.currentTarget.setPointerCapture(e.pointerId);
                startCollateralRepeat(-1);
              }}
              onPointerUp={clearCollateralRepeat}
              onPointerCancel={clearCollateralRepeat}
              onLostPointerCapture={clearCollateralRepeat}
              className="flex h-4 w-8 shrink-0 touch-manipulation select-none items-center justify-center text-primary/70 transition-colors hover:bg-theme/10 hover:text-primary disabled:opacity-40"
            >
              <Minus className="h-3 w-3" />
            </button>
          </div>
          <div className="flex flex-col border-l border-outline">
            <button
              type="button"
              onClick={() => setCollateralUnit("btc")}
              className={cn(
                "px-2 py-0.5 text-xs font-medium transition-colors",
                collateralUnit === "btc"
                  ? "bg-theme/20 text-theme"
                  : "text-primary/50 hover:text-primary/80"
              )}
            >
              BTC
            </button>
            <button
              type="button"
              onClick={() => setCollateralUnit("usd")}
              className={cn(
                "px-2 py-0.5 text-xs font-medium transition-colors",
                collateralUnit === "usd"
                  ? "bg-theme/20 text-theme"
                  : "text-primary/50 hover:text-primary/80"
              )}
            >
              USD
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {COLLATERAL_PRESETS.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => {
                if (!tradingAccountBalance) return;
                const maxBtc = parseFloat(tradingAccountBalanceString || "0");
                const btc = maxBtc * (v / 100);
                setBtcAmount(btc > 0 ? btc.toFixed(8) : "");
                setPercent(v);
              }}
              disabled={!tradingAccountBalance}
              className={cn(
                "rounded border px-1.5 py-0.5 text-[10px] font-medium transition-colors disabled:opacity-40",
                percent === v
                  ? "border-theme/50 bg-theme/20 text-theme"
                  : "border-outline text-primary/70 hover:border-theme/30 hover:bg-theme/10 max-md:opacity-60 max-md:hover:opacity-100"
              )}
            >
              {v}%
            </button>
          ))}
        </div>
        <Slider
          value={[percent]}
          onValueChange={(val) => {
            if (!tradingAccountBalance) return;
            const maxBtc = parseFloat(tradingAccountBalanceString || "0");
            const btc = maxBtc * (val[0] / 100);
            setBtcAmount(btc > 0 ? btc.toFixed(8) : "");
            setPercent(val[0]);
          }}
          min={0}
          max={100}
          step={1}
          disabled={!tradingAccountBalance}
          className="w-full"
        />
      </div>

      {/* 4. Leverage — own row */}
      <div className="space-y-0.5 max-md:border-t max-md:border-border/30 max-md:pt-3">
        <label
          className={cn(
            "block text-sm font-medium text-primary/90",
            width < 350 && "text-xs"
          )}
        >
          Leverage
        </label>
        {/* Mobile: [−] [input] [+] */}
        <div className="flex items-stretch gap-2 md:hidden">
          <button
            type="button"
            onClick={() =>
              setLeverage(
                String(Math.max(1, (parseInt(leverage, 10) || 1) - 1))
              )
            }
            disabled={
              !tradingAccountBalance || (parseInt(leverage, 10) || 1) <= 1
            }
            className="flex h-12 w-12 shrink-0 touch-manipulation select-none items-center justify-center rounded-md border border-outline text-primary/70 transition-colors hover:bg-theme/10 hover:text-primary disabled:opacity-40"
          >
            <Minus className="h-4 w-4" />
          </button>
          <div className="flex min-w-0 flex-1 overflow-hidden rounded-md border border-outline bg-transparent shadow-sm focus-within:ring-1 focus-within:ring-primary">
            <Input
              type="text"
              inputMode="numeric"
              placeholder="5"
              value={leverage}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, "");
                const n = parseInt(v || "5", 10);
                if (n >= 1 && n <= 50) {
                  setLeverage(String(n));
                } else if (v === "") {
                  setLeverage("");
                }
              }}
              className="h-12 min-w-0 flex-1 border-0 bg-transparent px-3 text-center text-base font-medium tabular-nums shadow-none focus-visible:ring-0"
              disabled={!tradingAccountBalance}
            />
          </div>
          <button
            type="button"
            onClick={() =>
              setLeverage(
                String(Math.min(50, (parseInt(leverage, 10) || 1) + 1))
              )
            }
            disabled={
              !tradingAccountBalance || (parseInt(leverage, 10) || 1) >= 50
            }
            className="flex h-12 w-12 shrink-0 touch-manipulation select-none items-center justify-center rounded-md border border-outline text-primary/70 transition-colors hover:bg-theme/10 hover:text-primary disabled:opacity-40"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        {/* Desktop: original stacked stepper layout */}
        <div className="hidden items-stretch gap-0 overflow-hidden rounded-md border border-outline bg-transparent shadow-sm focus-within:ring-1 focus-within:ring-primary md:flex">
          <Input
            type="text"
            inputMode="numeric"
            placeholder="5"
            value={leverage}
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, "");
              const n = parseInt(v || "5", 10);
              if (n >= 1 && n <= 50) {
                setLeverage(String(n));
              } else if (v === "") {
                setLeverage("");
              }
            }}
            className="h-6 min-w-0 flex-1 border-0 bg-transparent px-2 py-1 text-base font-medium tabular-nums shadow-none focus-visible:ring-0"
            disabled={!tradingAccountBalance}
          />
          <div className="flex flex-col border-l border-outline">
            <button
              type="button"
              onClick={() =>
                setLeverage(
                  String(Math.min(50, (parseInt(leverage, 10) || 1) + 1))
                )
              }
              disabled={
                !tradingAccountBalance || (parseInt(leverage, 10) || 1) >= 50
              }
              className="flex h-4 w-8 shrink-0 items-center justify-center text-primary/70 transition-colors hover:bg-theme/10 hover:text-primary disabled:opacity-40"
            >
              <Plus className="h-3 w-3" />
            </button>
            <button
              type="button"
              onClick={() =>
                setLeverage(
                  String(Math.max(1, (parseInt(leverage, 10) || 1) - 1))
                )
              }
              disabled={
                !tradingAccountBalance || (parseInt(leverage, 10) || 1) <= 1
              }
              className="flex h-4 w-8 shrink-0 items-center justify-center text-primary/70 transition-colors hover:bg-theme/10 hover:text-primary disabled:opacity-40"
            >
              <Minus className="h-3 w-3" />
            </button>
          </div>
        </div>
        <Slider
          value={[Math.min(50, Math.max(1, parseInt(leverage, 10) || 1))]}
          onValueChange={(val) => {
            const v = Math.min(50, Math.max(1, val[0]));
            setLeverage(String(v));
          }}
          min={1}
          max={50}
          step={1}
          disabled={!tradingAccountBalance}
          className="w-full"
        />
        <div className="flex flex-wrap gap-1.5">
          {LEVERAGE_PRESETS.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setLeverage(String(v))}
              disabled={!tradingAccountBalance}
              className={cn(
                "rounded border px-1.5 py-0.5 text-[10px] font-medium transition-colors disabled:opacity-40",
                parseInt(leverage, 10) === v
                  ? "border-theme/50 bg-theme/20 text-theme"
                  : "border-outline text-primary/70 hover:border-theme/30 hover:bg-theme/10 max-md:opacity-60 max-md:hover:opacity-100"
              )}
            >
              {v}x
            </button>
          ))}
        </div>
      </div>

      {/* 5. Trade Summary / Risk */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 max-md:border-t max-md:border-border/30 max-md:pt-3">
        <div className="flex flex-col gap-px">
          <span className="text-xs text-primary/60">Position Value</span>
          <span className="text-sm font-medium tabular-nums">
            ${positionSize}
          </span>
        </div>
        <div className="flex flex-col gap-px">
          <span className="text-xs text-primary/60">Exposure</span>
          <span className="text-sm font-medium tabular-nums">
            {positionSizeBtc} BTC
          </span>
        </div>
        <div className="flex flex-col gap-px">
          <span className="text-xs text-green-medium/70 max-md:text-primary/50">Liq Buy</span>
          <span className="text-sm font-medium tabular-nums text-green-medium/90">
            ${liquidationPrices.long}
          </span>
        </div>
        <div className="flex flex-col gap-px">
          <span className="text-xs text-red/70 max-md:text-primary/50">Liq Sell</span>
          <span className="text-sm font-medium tabular-nums text-red/90">
            ${liquidationPrices.short}
          </span>
        </div>
      </div>

      {/* 6. Execution Zone */}
      {status === "Connected" ? (
        <ExchangeResource>
          <div className="flex flex-row gap-2 pt-0.5 max-md:border-t max-md:border-border/30 max-md:pt-3">
            <Button
              className="min-w-0 flex-1 border-green-medium py-2 text-sm text-green-medium opacity-70 transition-opacity hover:border-green-medium hover:text-green-medium hover:opacity-100 disabled:opacity-40 disabled:hover:border-green-medium max-md:h-12 max-md:bg-green-medium/10 max-md:text-base max-md:font-semibold max-md:opacity-100 max-md:active:bg-green-medium/20"
              variant="ui"
              type="submit"
              value="buy"
              disabled={isSubmitting || Big(tradingAccountBalance).lte(0)}
            >
              {isSubmitting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                buyLabel
              )}
            </Button>
            <Button
              className="min-w-0 flex-1 border-red py-2 text-sm text-red opacity-70 transition-opacity hover:border-red hover:text-red hover:opacity-100 disabled:opacity-40 disabled:hover:border-red max-md:h-12 max-md:bg-red/10 max-md:text-base max-md:font-semibold max-md:opacity-100 max-md:active:bg-red/20"
              variant="ui"
              type="submit"
              value="sell"
              disabled={isSubmitting || Big(tradingAccountBalance).lte(0)}
            >
              {isSubmitting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                sellLabel
              )}
            </Button>
          </div>
        </ExchangeResource>
      ) : (
        <div className="flex w-full justify-center">
          <ConnectWallet />
        </div>
      )}
    </form>
  );
};

export default OrderLimitForm;
