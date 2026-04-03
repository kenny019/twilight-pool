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
import useGetTwilightBTCBalance from "@/lib/hooks/useGetTwilightBtcBalance";
import { useToast } from "@/lib/hooks/useToast";
import { usePriceFeed } from "@/lib/providers/feed";
import { useGrid } from "@/lib/providers/grid";
import { useSessionStore, useSignStatus } from "@/lib/providers/session";
import { useTwilightStore, useTwilightStoreApi } from "@/lib/providers/store";
import { useTwilight } from "@/lib/providers/twilight";
import BTC, { BTCDenoms } from "@/lib/twilight/denoms";
import { createFundingToTradingTransferMsg } from "@/lib/twilight/wallet";
import { createZkAccountWithBalance, createZkOrder } from "@/lib/twilight/zk";
import { createQueryTradeOrderMsg } from "@/lib/twilight/zkos";
import { ZkAccount } from "@/lib/types";
import { ZkPrivateAccount } from "@/lib/zk/account";
import { usdNumberFormatter } from "@/lib/utils/format";
import {
  assertMasterAccountActionAllowed,
  createPendingMasterAccountRecovery,
  getMasterAccountBlockedMessage,
} from "@/lib/utils/masterAccountRecovery";
import { masterAccountQueue } from "@/lib/utils/masterAccountQueue";
import {
  hasUtxoData,
  serializeTxid,
  waitForUtxoUpdate,
} from "@/lib/utils/waitForUtxoUpdate";
import { WalletStatus } from "@cosmos-kit/core";
import { useWallet } from "@cosmos-kit/react-lite";
import Big from "big.js";
import dayjs from "dayjs";
import { Loader2, Minus, Plus } from "lucide-react";
import Link from "next/link";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

const COLLATERAL_STEP_BTC = 0.000001;
const COLLATERAL_STEP_USD = 10;
/** Same timing as limit order price / margin repeat. */
const COLLATERAL_REPEAT_INITIAL_DELAY_MS = 450;
const COLLATERAL_REPEAT_INTERVAL_MS = 55;
const COLLATERAL_PRESETS = [25, 50, 75, 100] as const;
const LEVERAGE_PRESETS = [2, 5, 10, 25, 50] as const;
const MAX_COLLATERAL_INTEGER_DIGITS = 8;
const MAX_LEVERAGE_DIGITS = 2;

function sanitizeDecimalInput(
  rawValue: string,
  maxIntegerDigits: number,
  maxDecimals: number
): string {
  const cleaned = rawValue.replace(/[^\d.]/g, "");

  if (!cleaned) return "";

  const startsWithDot = cleaned.startsWith(".");
  const [integerRaw = "", ...decimalRawParts] = cleaned.split(".");
  const integerPart = integerRaw.slice(0, maxIntegerDigits);
  const decimalPart = decimalRawParts.join("").slice(0, maxDecimals);

  if (startsWithDot) {
    return decimalPart ? `.${decimalPart}` : ".";
  }

  if (cleaned.includes(".")) {
    return `${integerPart}.${decimalPart}`;
  }

  return integerPart;
}

function trimTrailingZeros(value: string): string {
  return value.replace(/(\.\d*?[1-9])0+$|\.0*$/, "$1");
}

function formatAmountInputValue(
  value: number,
  unit: "btc" | "usd"
): string {
  if (!Number.isFinite(value) || value <= 0) return "";

  return unit === "btc"
    ? trimTrailingZeros(value.toFixed(8))
    : value.toFixed(2);
}

const OrderMarketForm = () => {
  const { width } = useGrid();

  const privateKey = useSessionStore((state) => state.privateKey);
  const { retrySign } = useSignStatus();

  // Raw store API — lets queue tasks read the latest state at execution time
  // instead of relying on a potentially-stale React closure.
  const storeApi = useTwilightStoreApi();

  const { isLoading: isSatsLoading } = useGetTwilightBTCBalance();

  const marketStats = useGetMarketStats();

  const { hasRegisteredBTC } = useTwilight();
  const { getCurrentPrice, subscribe } = usePriceFeed();
  const liveBtcPrice = useSyncExternalStore(
    subscribe,
    getCurrentPrice,
    () => 0
  );
  const storedBtcPrice = useSessionStore((state) => state.price.btcPrice);

  const currentPrice = liveBtcPrice || storedBtcPrice; // binance websocket stream does not work for USA Ip address
  const isPageLoaded = currentPrice > 0 && !isSatsLoading;

  const { toast } = useToast();

  const { status } = useWallet();

  const leverageRef = useRef<HTMLInputElement>(null);

  const zkAccounts = useTwilightStore((state) => state.zk.zkAccounts);
  const masterAccountBlocked = useTwilightStore(
    (state) => state.zk.masterAccountBlocked
  );
  const masterAccountBlockReason = useTwilightStore(
    (state) => state.zk.masterAccountBlockReason
  );
  const setMasterAccountRecovery = useTwilightStore(
    (state) => state.zk.setMasterAccountRecovery
  );
  const tradingAccount = zkAccounts.find((account) => account.tag === "main");

  const tradingAccountBalance = tradingAccount?.value || 0;
  const tradingAccountBalanceString = new BTC(
    "sats",
    Big(tradingAccountBalance)
  )
    .convert("BTC")
    .toFixed(8);

  const { mainWallet } = useWallet();

  const addTrade = useTwilightStore((state) => state.trade.addTrade);
  const addTradeHistory = useTwilightStore(
    (state) => state.trade_history.addTrade
  );
  const updateZkAccount = useTwilightStore((state) => state.zk.updateZkAccount);

  const addZkAccount = useTwilightStore((state) => state.zk.addZkAccount);
  const optInLeaderboard = useTwilightStore((state) => state.optInLeaderboard);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [btcAmount, setBtcAmount] = useState<string>("");
  const [leverage, setLeverage] = useState<string>("5");
  const [percent, setPercent] = useState<number>(0);
  const [collateralUnit, setCollateralUnit] = useState<"btc" | "usd">("btc");
  const [amountInput, setAmountInput] = useState<string>("");
  const [isAmountInputFocused, setIsAmountInputFocused] = useState(false);
  const [leverageInput, setLeverageInput] = useState("5");
  const [isLeverageInputFocused, setIsLeverageInputFocused] = useState(false);

  const usdAmount = useMemo(() => {
    if (!btcAmount || !currentPrice || currentPrice <= 0) return "";
    const btc = parseFloat(btcAmount);
    if (!Number.isFinite(btc) || btc <= 0) return "";
    return Big(btc).mul(currentPrice).toFixed(2);
  }, [btcAmount, currentPrice]);

  const maxCollateralBtc = useMemo(
    () => parseFloat(tradingAccountBalanceString || "0") || 0,
    [tradingAccountBalanceString]
  );
  const maxCollateralUsd = useMemo(() => {
    if (!currentPrice || currentPrice <= 0 || maxCollateralBtc <= 0) return 0;
    return Number(Big(maxCollateralBtc).mul(currentPrice).toFixed(2));
  }, [currentPrice, maxCollateralBtc]);

  const updatePercent = useCallback((value: number) => {
    const finalValue = Math.max(0, Math.min(value, 100));
    setPercent(finalValue);
  }, []);

  const updateCollateralFromInput = useCallback(
    (rawValue: string) => {
      const nextValue = sanitizeDecimalInput(
        rawValue,
        MAX_COLLATERAL_INTEGER_DIGITS,
        collateralUnit === "btc" ? 8 : 2
      );

      if (!nextValue) {
        setAmountInput("");
        setBtcAmount("");
        setPercent(0);
        return;
      }

      if (nextValue === ".") {
        setAmountInput(nextValue);
        setBtcAmount("");
        setPercent(0);
        return;
      }

      let parsedValue = parseFloat(nextValue);
      if (!Number.isFinite(parsedValue) || parsedValue < 0) return;

      const maxValue =
        collateralUnit === "btc" ? maxCollateralBtc : maxCollateralUsd;
      if (maxValue > 0) {
        parsedValue = Math.min(parsedValue, maxValue);
      }

      const normalizedInput =
        parsedValue === parseFloat(nextValue)
          ? nextValue
          : formatAmountInputValue(parsedValue, collateralUnit);

      setAmountInput(normalizedInput);

      const nextBtcAmount =
        collateralUnit === "btc"
          ? parsedValue
          : currentPrice > 0
            ? Number(Big(parsedValue).div(currentPrice).toFixed(8))
            : 0;

      setBtcAmount(
        nextBtcAmount > 0 ? trimTrailingZeros(nextBtcAmount.toFixed(8)) : ""
      );

      if (maxCollateralBtc > 0) {
        updatePercent((nextBtcAmount / maxCollateralBtc) * 100);
      } else {
        setPercent(0);
      }
    },
    [collateralUnit, currentPrice, maxCollateralBtc, maxCollateralUsd, updatePercent]
  );

  const normalizeAmountInput = useCallback(() => {
    if (!amountInput || amountInput === ".") {
      setAmountInput("");
      setBtcAmount("");
      setPercent(0);
      return;
    }

    const normalizedValue =
      collateralUnit === "btc"
        ? formatAmountInputValue(parseFloat(btcAmount || "0"), "btc")
        : usdAmount;

    setAmountInput(normalizedValue);
  }, [amountInput, btcAmount, collateralUnit, usdAmount]);

  const handleLeverageInputChange = useCallback((rawValue: string) => {
    const nextValue = rawValue.replace(/\D/g, "").slice(0, MAX_LEVERAGE_DIGITS);
    setLeverageInput(nextValue);

    if (!nextValue) {
      setLeverage("");
      return;
    }

    const parsedValue = parseInt(nextValue, 10);
    if (!Number.isFinite(parsedValue)) return;

    if (parsedValue > 50) {
      setLeverage("50");
      setLeverageInput("50");
      return;
    }

    if (parsedValue >= 1) {
      setLeverage(String(parsedValue));
    }
  }, []);

  const handleLeverageInputBlur = useCallback(() => {
    const parsedValue = parseInt(leverageInput || leverage || "5", 10);
    const normalizedValue = Number.isFinite(parsedValue)
      ? Math.max(1, Math.min(parsedValue, 50))
      : 5;

    setLeverage(String(normalizedValue));
    setLeverageInput(String(normalizedValue));
  }, [leverage, leverageInput]);

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
      if (!currentPrice || currentPrice <= 0) return;
      const currentBtc = parseFloat(btcAmount || "0") || 0;
      const btcDelta = delta / currentPrice;
      const maxBtc = parseFloat(tradingAccountBalanceString || "0");
      const newBtc = Math.max(0, Math.min(currentBtc + btcDelta, maxBtc));
      setBtcAmount(newBtc > 0 ? newBtc.toFixed(8) : "");
      if (tradingAccountBalance > 0 && maxBtc > 0) {
        updatePercent((newBtc / maxBtc) * 100);
      }
    },
    [
      btcAmount,
      currentPrice,
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
        }, COLLATERAL_REPEAT_INTERVAL_MS);
      }, COLLATERAL_REPEAT_INITIAL_DELAY_MS);
    },
    [adjustCollateral, clearCollateralRepeat]
  );

  useEffect(() => () => clearCollateralRepeat(), [clearCollateralRepeat]);

  const addTransactionHistory = useTwilightStore(
    (state) => state.history.addTransaction
  );

  const positionSize = useMemo(() => {
    if (!usdAmount || !leverage) {
      return "0.00";
    }

    try {
      const usdAmountBig = Big(usdAmount || "0");
      const leverageBig = Big(leverage || "1");

      if (usdAmountBig.lte(0) || leverageBig.lte(0)) {
        return "0.00";
      }

      return new Intl.NumberFormat("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(Number(usdAmountBig.mul(leverageBig).toFixed(2)));
    } catch (error) {
      console.error("Error calculating position size:", error);
      return "0.00";
    }
  }, [usdAmount, leverage]);

  const positionSizeBtc = useMemo(() => {
    if (!usdAmount || !leverage || !currentPrice || currentPrice <= 0)
      return "0.000000";
    try {
      const leverageBig = Big(leverage || "1");
      const usdBig = Big(usdAmount);
      if (usdBig.lte(0) || leverageBig.lte(0)) return "0.000000";
      const btcValue = usdBig
        .div(Big(currentPrice))
        .mul(leverageBig)
        .toNumber();
      return Number(btcValue.toFixed(6)).toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 6,
      });
    } catch {
      return "0.000000";
    }
  }, [usdAmount, leverage, currentPrice]);

  const liquidationPrices = useMemo(() => {
    if (
      !currentPrice ||
      !leverage ||
      !btcAmount ||
      currentPrice <= 0 ||
      Big(btcAmount || "0").lte(0) ||
      Big(leverage || "0").lte(0)
    ) {
      return { long: "0.00", short: "0.00" };
    }

    try {
      const entryPrice = Big(currentPrice);
      const leverageBig = Big(leverage || "1");
      const mmRate = 0.004; // 0.4% - matches backend maintenancemargin

      if (leverageBig.lte(0)) return { long: "0.00", short: "0.00" };

      const usdFormatter = new Intl.NumberFormat("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

      // Inverse perps: liqLong = entry × leverage × (1 + mmRate) / (leverage + 1)
      const liqLong = entryPrice
        .mul(leverageBig)
        .mul(Big(1).plus(mmRate))
        .div(leverageBig.plus(1));
      const liqLongNum = Number(liqLong.toFixed(2));
      const entryPriceNum = Number(entryPrice.toFixed(2));

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
        shortDisplay =
          liqShortNum <= entryPriceNum || !Number.isFinite(liqShortNum)
            ? "0.00"
            : usdFormatter.format(liqShortNum);
      } else {
        // Leverage 1 short: no liquidation (infinite liq price)
        shortDisplay = "—";
      }

      return {
        long:
          liqLongNum <= 0 ||
          liqLongNum >= entryPriceNum ||
          !Number.isFinite(liqLongNum)
            ? "0.00"
            : usdFormatter.format(liqLongNum),
        short: shortDisplay,
      };
    } catch (error) {
      console.error("Error calculating liquidation prices:", error);
      return { long: "0.00", short: "0.00" };
    }
  }, [currentPrice, leverage, btcAmount]);

  async function submitMarket(type: "SELL" | "BUY") {
    if (!privateKey) {
      await retrySign();
      return;
    }

    const positionType = type === "BUY" ? "LONG" : "SHORT";

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

    if (!btcAmount || Big(btcAmount).lte(0)) {
      toast({
        variant: "error",
        title: "Invalid amount",
        description: "Please enter an amount to trade.",
      });
      return;
    }

    const btcValue = btcAmount;

    if (Big(btcValue).lte(0.00001)) {
      toast({
        variant: "error",
        title: "Invalid amount",
        description: "Please enter an amount greater than 0.00001 BTC.",
      });
      return;
    }

    const twilightAddress = chainWallet.address;

    if (!twilightAddress || !hasRegisteredBTC || !tradingAccount) {
      console.error("unexpected error");
      return;
    }

    try {
      const satsValue = Math.floor(
        new BTC("BTC", Big(btcValue)).convert("sats").toNumber()
      );

      if (tradingAccountBalance < satsValue) {
        toast({
          variant: "error",
          title: "Insufficient funds",
          description:
            "You do not have enough funds to submit this trade order",
        });
        return;
      }

      const leverageVal = parseInt(leverage || "1", 10);
      const orderValue = satsValue * leverageVal;
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

      // Generate the new order account before entering the queue — this is
      // pure in-memory work and does not touch the master UTXO.
      const { account: newTradingAccount } = await createZkAccountWithBalance({
        tag: "market",
        balance: satsValue,
        signature: privateKey,
      });

      const tag = `BTC ${type.toLowerCase()} ${newTradingAccount.address.slice(0, 6)}`;

      // --- Master-account critical section (serialised via queue) -----------
      // The queue guarantees only one task at a time touches the master UTXO,
      // preventing double-spend races with useSyncTrades cleanup tasks.
      let queueResult: { newZkAccount: ZkAccount; txId: string };
      try {
        queueResult = await masterAccountQueue.enqueue(async () => {
          // Read fresh master account at execution time (not from React closure).
          const state = storeApi.getState();
          assertMasterAccountActionAllowed({
            masterAccountBlocked: state.zk.masterAccountBlocked,
            masterAccountBlockReason: state.zk.masterAccountBlockReason,
          });

          const currentTradingAccount = state.zk.zkAccounts.find(
            (a) => a.tag === "main"
          );

          if (!currentTradingAccount) {
            throw new Error("Master trading account not found");
          }

          if (
            !currentTradingAccount.isOnChain ||
            !currentTradingAccount.value
          ) {
            throw new Error("Master trading account is not on-chain");
          }

          if ((currentTradingAccount.value ?? 0) < satsValue) {
            throw new Error("Insufficient funds in master trading account");
          }

          // Snapshot the current UTXO txid so we can detect when the chain
          // updates after broadcast.
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
              satsValue,
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
            tag,
            isOnChain: true,
            value: satsValue,
            createdAt: dayjs().unix(),
          };

          // Wait for the UTXO store to reflect the broadcast before releasing
          // the lock, so the next queued task starts from consistent state.
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
              toTag: tag,
              tx_hash: txId,
              type: "Transfer",
              value: satsValue,
            });
            setMasterAccountRecovery(
              createPendingMasterAccountRecovery({
                address: senderZkPrivateAccount.get().address,
                scalar: senderZkPrivateAccount.get().scalar,
                value: senderZkPrivateAccount.get().value,
                source: "market order funding transfer",
                txId,
              })
            );
            throw new Error(
              "Trading account recovery is in progress after a delayed UTXO update. Your funds remain visible locally. Please wait for recovery to finish before retrying."
            );
          }

          // Add the new order account first so it is tracked even if a later
          // step fails (recovery is possible via manual cleanup).
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
            toTag: tag,
            tx_hash: txId,
            type: "Transfer",
            value: satsValue,
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
              : "An error occurred when transferring funds from the trading account, please try again later.",
          variant: "error",
        });
        return;
      }
      // --- End of critical section ------------------------------------------

      const { newZkAccount } = queueResult;

      const { success, msg } = await createZkOrder({
        leverage: leverageVal,
        orderType: "MARKET",
        positionType,
        signature: privateKey,
        timebounds: 1,
        zkAccount: newZkAccount as ZkAccount,
        value: satsValue,
      });

      if (!success || !msg) {
        toast({
          variant: "error",
          title: "Unable to submit trade order",
          description: "An error has occurred, try again later.",
        });
        return;
      }

      const data = await sendTradeOrder(
        msg,
        optInLeaderboard ? twilightAddress : undefined
      );

      if (!data.result || !data.result.id_key) {
        toast({
          variant: "error",
          title: "Unable to submit trade order",
          description:
            "An error has occurred when submitting the trade order, please try again later.",
        });
        return;
      }

      console.log(data);

      const transactionHashCondition = (
        txHashResult: Awaited<ReturnType<typeof queryTransactionHashes>>
      ) => {
        if (txHashResult.result) {
          const found = txHashResult.result.find(
            (r) =>
              !isErrorStatus(r.order_status) && !isCancelStatus(r.order_status)
          );
          return !!found;
        }
        return false;
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

      const transactionHashRes = await retry<
        ReturnType<typeof queryTransactionHashes>,
        string
      >(
        queryTransactionHashes,
        30,
        newZkAccount.address,
        1000,
        transactionHashCondition,
        transactionHashFailCondition
      );

      if (!transactionHashRes.success) {
        if (transactionHashRes.cancelled) {
          toast({
            variant: "error",
            title: "Order request denied",
            description:
              "Your order request was denied by the relayer. Your funds remain in your account. Please try again.",
          });
        } else {
          toast({
            variant: "error",
            title: "Error",
            description: "Error with creating trade order",
          });
        }
        return;
      }

      const orderData = transactionHashRes.data.result.find(
        (r) => !isErrorStatus(r.order_status) && !isCancelStatus(r.order_status)
      );

      if (!orderData) {
        toast({
          variant: "error",
          title: "Error",
          description: "Error with creating trade order",
        });
        return;
      }

      console.log("orderData", orderData);

      toast({
        title: "Success",
        description: (
          <div className="flex space-x-1 opacity-90">
            Successfully submitted trade order.{" "}
            <Button
              variant="link"
              className="inline-flex text-sm opacity-90 hover:opacity-100"
              asChild
            >
              <Link
                href={`${process.env.NEXT_PUBLIC_EXPLORER_URL as string}/txs/${orderData.tx_hash}`}
                target={"_blank"}
              >
                Explorer link
              </Link>
            </Button>
          </div>
        ),
      });

      const queryTradeOrderMsg = await createQueryTradeOrderMsg({
        address: newZkAccount.address,
        orderStatus: orderData.order_status,
        signature: privateKey,
      });

      console.log("queryTradeOrderMsg", queryTradeOrderMsg);

      const queryTradeOrderRes = await queryTradeOrder(queryTradeOrderMsg);

      if (!queryTradeOrderRes) {
        throw new Error("Failed to query trade order");
      }

      const traderOrderInfo = queryTradeOrderRes.result;

      console.log("traderOrderInfo", traderOrderInfo);

      const newTradeData = {
        accountAddress: newZkAccount.address,
        orderStatus: orderData.order_status,
        positionType,
        orderType: orderData.order_type,
        tx_hash: orderData.tx_hash,
        uuid: orderData.order_id,
        value: satsValue,
        output: orderData.output ?? undefined,
        entryPrice: new Big(traderOrderInfo.entryprice).toNumber(),
        leverage: leverageVal,
        isOpen: true,
        date: dayjs(traderOrderInfo.timestamp).toDate(),
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

      updateZkAccount(newZkAccount.address, {
        ...newZkAccount,
        type: "Memo",
      });

      toast({
        title: "Order placed successfully",
        description: (
          <div className="opacity-90">
            Successfully placed market order.{" "}
            {orderData.tx_hash && (
              <Link
                href={`${process.env.NEXT_PUBLIC_EXPLORER_URL as string}/txs/${orderData.tx_hash}`}
                target={"_blank"}
                className="text-sm underline hover:opacity-100"
              >
                Explorer link
              </Link>
            )}
          </div>
        ),
      });

      // Clear form
      setBtcAmount("");
      setLeverage("5");
      setPercent(0);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  }

  const primaryValue = collateralUnit === "btc" ? btcAmount : usdAmount;
  const secondaryRef =
    collateralUnit === "btc"
      ? currentPrice > 0 && usdAmount
        ? `≈ $${usdNumberFormatter.format(parseFloat(usdAmount))}`
        : null
      : btcAmount
        ? `≈ ${btcAmount} BTC`
        : null;

  const step =
    collateralUnit === "btc" ? COLLATERAL_STEP_BTC : COLLATERAL_STEP_USD;
  collateralStepRef.current = step;

  useEffect(() => {
    if (!isAmountInputFocused) {
      setAmountInput(primaryValue);
    }
  }, [isAmountInputFocused, primaryValue]);

  useEffect(() => {
    if (!isLeverageInputFocused) {
      setLeverageInput(leverage || "");
    }
  }, [isLeverageInputFocused, leverage]);

  const marginStepDisabled =
    !tradingAccountBalance || (collateralUnit === "usd" && !currentPrice);

  const setMaxCollateral = useCallback(() => {
    if (!tradingAccountBalance) return;
    setBtcAmount(maxCollateralBtc > 0 ? trimTrailingZeros(maxCollateralBtc.toFixed(8)) : "");
    setPercent(100);
  }, [maxCollateralBtc, tradingAccountBalance]);

  return (
    <form
      onSubmit={(e) => e.preventDefault()}
      className="flex flex-col gap-2 px-3 py-3"
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
          {currentPrice > 0 && (
            <span className="text-primary/70">
              {" "}
              ($
              {usdNumberFormatter.format(
                parseFloat(tradingAccountBalanceString || "0") * currentPrice
              )}
              )
            </span>
          )}
        </span>
      </div>

      {/* 2. Margin Amount — single master input */}
      <div className="-mt-0.5 space-y-0.5">
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
              <div className="flex items-center gap-1">
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="0"
                  value={amountInput}
                  onChange={(e) => updateCollateralFromInput(e.target.value)}
                  onFocus={() => setIsAmountInputFocused(true)}
                  onBlur={() => {
                    setIsAmountInputFocused(false);
                    normalizeAmountInput();
                  }}
                  className="h-auto min-h-0 min-w-0 flex-1 border-0 bg-transparent p-0 text-base font-medium tabular-nums shadow-none focus-visible:ring-0"
                  disabled={!tradingAccountBalance}
                />
                <button
                  type="button"
                  onClick={setMaxCollateral}
                  disabled={!tradingAccountBalance}
                  className="shrink-0 text-[10px] font-medium text-theme transition-colors hover:opacity-80 disabled:opacity-40"
                >
                  Max
                </button>
              </div>
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
          <div className="flex min-w-0 flex-1 flex-col justify-center px-2 py-1.5">
            <div className="flex items-center gap-1">
              <Input
                type="text"
                inputMode="decimal"
                placeholder="0"
                value={amountInput}
                onChange={(e) => updateCollateralFromInput(e.target.value)}
                onFocus={() => setIsAmountInputFocused(true)}
                onBlur={() => {
                  setIsAmountInputFocused(false);
                  normalizeAmountInput();
                }}
                className="h-auto min-h-0 min-w-0 flex-1 border-0 bg-transparent p-0 text-base font-medium tabular-nums shadow-none focus-visible:ring-0"
                disabled={!tradingAccountBalance}
              />
              <button
                type="button"
                onClick={setMaxCollateral}
                disabled={!tradingAccountBalance}
                className="shrink-0 text-[10px] font-medium text-theme transition-colors hover:opacity-80 disabled:opacity-40"
              >
                Max
              </button>
            </div>
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
              className="flex h-5 w-9 shrink-0 touch-manipulation select-none items-center justify-center text-primary/70 transition-colors hover:bg-theme/10 hover:text-primary disabled:opacity-40"
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
              className="flex h-5 w-9 shrink-0 touch-manipulation select-none items-center justify-center text-primary/70 transition-colors hover:bg-theme/10 hover:text-primary disabled:opacity-40"
            >
              <Minus className="h-3 w-3" />
            </button>
          </div>
          <div className="flex flex-col border-l border-outline">
            <button
              type="button"
              onClick={() => setCollateralUnit("btc")}
              className={cn(
                "px-2 py-0.5 text-[10px] font-medium transition-colors",
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
                "px-2 py-0.5 text-[10px] font-medium transition-colors",
                collateralUnit === "usd"
                  ? "bg-theme/20 text-theme"
                  : "text-primary/50 hover:text-primary/80"
              )}
            >
              USD
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-1">
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

      {/* 3. Leverage — input first, then slider, then presets */}
      <div className="space-y-0.5 max-md:border-t max-md:border-border/30 max-md:pt-2.5">
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
            onClick={() => setLeverage(String(Math.max(1, (parseInt(leverage, 10) || 1) - 1)))}
            disabled={!tradingAccountBalance || (parseInt(leverage, 10) || 1) <= 1}
            className="flex h-11 w-11 shrink-0 touch-manipulation select-none items-center justify-center rounded-md border border-outline text-primary/70 transition-colors hover:bg-theme/10 hover:text-primary disabled:opacity-40"
          >
            <Minus className="h-4 w-4" />
          </button>
          <div className="flex min-w-0 flex-1 overflow-hidden rounded-md border border-outline bg-transparent shadow-sm focus-within:ring-1 focus-within:ring-primary">
            <Input
              ref={leverageRef}
              type="text"
              inputMode="numeric"
              placeholder="5"
              value={leverageInput}
              onChange={(e) => handleLeverageInputChange(e.target.value)}
              onFocus={() => setIsLeverageInputFocused(true)}
              onBlur={() => {
                setIsLeverageInputFocused(false);
                handleLeverageInputBlur();
              }}
              className="h-11 min-w-0 flex-1 border-0 bg-transparent px-3 text-center text-base font-medium tabular-nums shadow-none focus-visible:ring-0"
              disabled={!tradingAccountBalance}
            />
          </div>
          <button
            type="button"
            onClick={() => setLeverage(String(Math.min(50, (parseInt(leverage, 10) || 1) + 1)))}
            disabled={!tradingAccountBalance || (parseInt(leverage, 10) || 1) >= 50}
            className="flex h-11 w-11 shrink-0 touch-manipulation select-none items-center justify-center rounded-md border border-outline text-primary/70 transition-colors hover:bg-theme/10 hover:text-primary disabled:opacity-40"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        {/* Desktop: original stacked stepper layout */}
        <div className="hidden items-stretch gap-0 overflow-hidden rounded-md border border-outline bg-transparent shadow-sm focus-within:ring-1 focus-within:ring-primary md:flex">
          <Input
            ref={leverageRef}
            type="text"
            inputMode="numeric"
            placeholder="5"
            value={leverageInput}
            onChange={(e) => handleLeverageInputChange(e.target.value)}
            onFocus={() => setIsLeverageInputFocused(true)}
            onBlur={() => {
              setIsLeverageInputFocused(false);
              handleLeverageInputBlur();
            }}
            className="h-10 min-w-0 flex-1 border-0 bg-transparent px-3 py-2 text-base font-medium tabular-nums shadow-none focus-visible:ring-0"
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
              className="flex h-5 w-9 shrink-0 items-center justify-center text-primary/70 transition-colors hover:bg-theme/10 hover:text-primary disabled:opacity-40"
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
              className="flex h-5 w-9 shrink-0 items-center justify-center text-primary/70 transition-colors hover:bg-theme/10 hover:text-primary disabled:opacity-40"
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
          className="mt-1 w-full md:mt-0"
        />
        <div className="flex flex-wrap gap-1">
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

      {/* 4. Trade Summary / Risk */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 max-md:border-t max-md:border-border/30 max-md:pt-2.5">
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
          <span className="text-xs text-primary/50">Liq Buy</span>
          <span className="tabular-nums text-sm font-medium text-green-medium/90">
            ${liquidationPrices.long}
          </span>
        </div>
        <div className="flex flex-col gap-px">
          <span className="text-xs text-primary/50">Liq Sell</span>
          <span className="tabular-nums text-sm font-medium text-red/90">
            ${liquidationPrices.short}
          </span>
        </div>
      </div>

      {/* 5. Execution Zone */}
      {status === "Connected" ? (
        <ExchangeResource>
          <div className="flex flex-col gap-1.5 pt-0.5 max-md:flex-row max-md:border-t max-md:border-border/30 max-md:pt-2.5">
            <Button
              onClick={() => submitMarket("BUY")}
              id="btn-market-buy"
              className="min-w-0 border-green-medium py-2 text-sm text-green-medium opacity-70 transition-colors hover:border-green-medium hover:text-green-medium hover:opacity-100 disabled:opacity-40 disabled:hover:border-green-medium max-md:flex-1 max-md:h-12 max-md:bg-green-medium/10 max-md:text-base max-md:font-semibold max-md:opacity-100 max-md:active:bg-green-medium/20"
              variant="ui"
              disabled={
                isSubmitting ||
                !isPageLoaded ||
                Big(tradingAccountBalance).lte(0)
              }
            >
              {isSubmitting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                "Buy"
              )}
            </Button>
            <Button
              onClick={() => submitMarket("SELL")}
              id="btn-market-sell"
              variant="ui"
              className="min-w-0 border-red py-2 text-sm text-red opacity-70 transition-colors hover:border-red hover:text-red hover:opacity-100 disabled:opacity-40 disabled:hover:border-red max-md:flex-1 max-md:h-12 max-md:bg-red/10 max-md:text-base max-md:font-semibold max-md:opacity-100 max-md:active:bg-red/20"
              disabled={
                isSubmitting ||
                !isPageLoaded ||
                Big(tradingAccountBalance).lte(0)
              }
            >
              {isSubmitting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                "Sell"
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

export default OrderMarketForm;
