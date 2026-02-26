import ConnectWallet from "@/app/_components/layout/connect-wallet.client";
import Button from "@/components/button";
import ExchangeResource from "@/components/exchange-resource";
import { Input, NumberInput } from "@/components/input";
import Resource from "@/components/resource";
import Skeleton from "@/components/skeleton";
import { Slider } from "@/components/slider";
import { Text } from "@/components/typography";
import { sendTradeOrder } from "@/lib/api/client";
import { queryTradeOrder } from "@/lib/api/relayer";
import { queryTransactionHashes } from "@/lib/api/rest";
import { queryUtxoForAddress } from "@/lib/api/zkos";
import cn from "@/lib/cn";
import { retry } from "@/lib/helpers";
import useGetMarketStats from "@/lib/hooks/useGetMarketStats";
import useGetTwilightBTCBalance from "@/lib/hooks/useGetTwilightBtcBalance";
import { useToast } from "@/lib/hooks/useToast";
import { usePriceFeed } from "@/lib/providers/feed";
import { useGrid } from "@/lib/providers/grid";
import { useSessionStore } from "@/lib/providers/session";
import { useTwilightStore, useTwilightStoreApi } from "@/lib/providers/store";
import { useTwilight } from "@/lib/providers/twilight";
import BTC, { BTCDenoms } from "@/lib/twilight/denoms";
import { createFundingToTradingTransferMsg } from "@/lib/twilight/wallet";
import { createZkAccountWithBalance, createZkOrder } from "@/lib/twilight/zk";
import { createQueryTradeOrderMsg } from "@/lib/twilight/zkos";
import { ZkAccount } from "@/lib/types";
import { ZkPrivateAccount } from "@/lib/zk/account";
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
import { Loader2 } from "lucide-react";
import Link from "next/link";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

const OrderMarketForm = () => {
  const { width } = useGrid();

  const privateKey = useSessionStore((state) => state.privateKey);

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

  const btcRef = useRef<HTMLInputElement>(null);
  const usdRef = useRef<HTMLInputElement>(null);
  const leverageRef = useRef<HTMLInputElement>(null);

  const zkAccounts = useTwilightStore((state) => state.zk.zkAccounts);
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
  const [usdAmount, setUsdAmount] = useState<string>("");
  const [leverage, setLeverage] = useState<string>("1");

  const [percent, setPercent] = useState<number>(0);

  const updatePercent = useCallback((value: number) => {
    const finalValue = Math.max(0, Math.min(value, 100));
    setPercent(finalValue);
  }, []);

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

      Big.DP = 2;
      return new Intl.NumberFormat("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(Number(usdAmountBig.mul(leverageBig).toFixed(2)));
    } catch (error) {
      console.error("Error calculating position size:", error);
      return "0.00";
    }
  }, [usdAmount, leverage]);

  const liquidationPrices = useMemo(() => {
    if (!usdAmount || !leverage || !currentPrice || currentPrice <= 0) {
      return { long: "0.00", short: "0.00" };
    }

    try {
      const initialMargin = Big(usdAmount || "0");
      const leverageBig = Big(leverage || "1");
      const entryPrice = Big(currentPrice);

      if (initialMargin.lte(0) || leverageBig.lte(0)) {
        return { long: "0.00", short: "0.00" };
      }

      // entryvalue = initial_margin * leverage
      const entryValue = initialMargin.mul(leverageBig);
      // positionsize = entryvalue * entryprice
      const positionSizeCalc = entryValue.mul(entryPrice);

      // bankruptcyprice for LONG = entryprice * leverage / (leverage + 1)
      const bankruptcyPriceLong = entryPrice
        .mul(leverageBig)
        .div(leverageBig.plus(1));
      // bankruptcyprice for SHORT = entryprice * leverage / (leverage - 1) (if leverage > 1, else 0)
      const bankruptcyPriceShort = leverageBig.gt(1)
        ? entryPrice.mul(leverageBig).div(leverageBig.minus(1))
        : Big(0);

      // bankruptcyvalue = positionsize / bankruptcyprice
      const bankruptcyValueLong = bankruptcyPriceLong.gt(0)
        ? positionSizeCalc.div(bankruptcyPriceLong)
        : Big(0);
      const bankruptcyValueShort = bankruptcyPriceShort.gt(0)
        ? positionSizeCalc.div(bankruptcyPriceShort)
        : Big(0);

      // maintenancemargin = (0.4 * entry_value + fee * bankruptcyvalue + funding * bankruptcyvalue) / 100
      // fee and funding are hardcoded to 0
      const fee = 0;
      const funding = 0;
      const mmLong = Big(0.4)
        .mul(entryValue)
        .plus(Big(fee).mul(bankruptcyValueLong))
        .plus(Big(funding).mul(bankruptcyValueLong))
        .div(100);
      const mmShort = Big(0.4)
        .mul(entryValue)
        .plus(Big(fee).mul(bankruptcyValueShort))
        .plus(Big(funding).mul(bankruptcyValueShort))
        .div(100);

      // liquidationprice = entryprice * positionsize / ((positionside * entryprice * (mm - im)) + positionsize)
      // positionside: LONG = -1, SHORT = 1
      // im = initial_margin (in USD)
      const im = initialMargin;

      // LONG: positionside = -1
      const longDenominator = Big(-1)
        .mul(entryPrice)
        .mul(mmLong.minus(im))
        .plus(positionSizeCalc);
      const liquidationPriceLong = longDenominator.eq(0)
        ? Big(0)
        : entryPrice.mul(positionSizeCalc).div(longDenominator);

      // SHORT: positionside = 1
      const shortDenominator = Big(1)
        .mul(entryPrice)
        .mul(mmShort.minus(im))
        .plus(positionSizeCalc);
      const liquidationPriceShort = shortDenominator.eq(0)
        ? Big(0)
        : entryPrice.mul(positionSizeCalc).div(shortDenominator);

      Big.DP = 2;
      return {
        long: liquidationPriceLong.lte(0)
          ? "0.00"
          : new Intl.NumberFormat("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }).format(Number(liquidationPriceLong.toFixed(2))),
        short: liquidationPriceShort.lte(0)
          ? "0.00"
          : new Intl.NumberFormat("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }).format(Number(liquidationPriceShort.toFixed(2))),
      };
    } catch (error) {
      console.error("Error calculating liquidation prices:", error);
      return { long: "0.00", short: "0.00" };
    }
  }, [usdAmount, leverage, currentPrice]);

  async function submitMarket(type: "SELL" | "BUY") {
    const positionType = type === "BUY" ? "LONG" : "SHORT";

    const chainWallet = mainWallet?.getChainWallet("nyks");

    if (!chainWallet) {
      toast({
        title: "Wallet is not connected",
        description: "Please connect your wallet to deposit.",
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

    if (!btcRef.current?.value) {
      toast({
        title: "Invalid amount",
        description: "Please enter an amount to trade.",
      });
      return;
    }

    const btcValue = btcRef.current?.value;

    if (btcValue && Big(btcValue).lte(0.00001)) {
      toast({
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

      const leverageVal = parseInt(leverageRef.current?.value || "1");
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
          const currentTradingAccount = storeApi
            .getState()
            .zk.zkAccounts.find((a) => a.tag === "main");

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

          // Wait for the UTXO store to reflect the broadcast before releasing
          // the lock, so the next queued task starts from consistent state.
          const utxoWait = await waitForUtxoUpdate(
            senderZkPrivateAccount.get().address,
            previousTxid
          );
          if (!utxoWait.success) {
            console.warn("waitForUtxoUpdate timed out:", utxoWait.message);
          }

          // Persist state updates atomically after UTXO is confirmed.
          const newZkAccount: ZkAccount = {
            scalar: updatedTradingAccountScalar,
            type: "Coin",
            address: updatedTradingAccountAddress,
            tag,
            isOnChain: true,
            value: satsValue,
            createdAt: dayjs().unix(),
          };

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
            fromTag: "Trading Account",
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

      const leverage = parseInt(leverageRef.current?.value || "1");

      const { success, msg } = await createZkOrder({
        leverage: leverage,
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
              r.tx_hash &&
              !r.tx_hash.includes("Error") &&
              r.order_status !== "CANCELLED"
          );
          return !!found;
        }
        return false;
      };

      const transactionHashFailCondition = (
        txHashResult: Awaited<ReturnType<typeof queryTransactionHashes>>
      ) => {
        return txHashResult.result?.some(
          (r) => r.order_status === "CANCELLED"
        ) ?? false;
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
        (r) =>
          r.tx_hash &&
          !r.tx_hash.includes("Error") &&
          r.order_status !== "CANCELLED"
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
        output: orderData.output,
        entryPrice: new Big(traderOrderInfo.entryprice).toNumber(),
        leverage: leverage,
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
      setUsdAmount("");
      setLeverage("1");
      setPercent(0);
      if (btcRef.current) btcRef.current.value = "";
      if (usdRef.current) usdRef.current.value = "";
      if (leverageRef.current) leverageRef.current.value = "";
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={(e) => e.preventDefault()}
      className="flex flex-col space-y-2 px-3"
    >
      <div className="flex justify-between text-xs">
        <span className="opacity-80">Avbl to trade</span>
        <Resource
          isLoaded={!isSatsLoading}
          placeholder={<Skeleton className="h-4 w-[80px]" />}
        >
          <span>{tradingAccountBalanceString} BTC</span>
        </Resource>
      </div>
      <div className="flex justify-between text-xs">
        <span className="text-green-medium">
          Liq. Price ≈ ${liquidationPrices.long}
        </span>
        <span className="text-red">
          Liq. Price ≈ ${liquidationPrices.short}
        </span>
      </div>
      <div className="flex justify-between space-x-4">
        <div>
          <Text
            className={cn("mb-1 text-sm opacity-80", width < 350 && "text-xs")}
            asChild
          >
            <label htmlFor="input-market-amount-btc">Amount (BTC)</label>
          </Text>
          <Input
            type="text"
            id="input-market-amount-btc"
            placeholder="0.000"
            ref={btcRef}
            onChange={(e) => {
              if (!usdRef.current) return;

              let value = e.currentTarget.value;

              // Remove any non-numeric characters except decimal point
              value = value.replace(/[^0-9.]/g, "");

              // Prevent multiple decimal points
              const decimalCount = (value.match(/\./g) || []).length;
              if (decimalCount > 1) {
                const firstDecimalIndex = value.indexOf(".");
                value =
                  value.substring(0, firstDecimalIndex + 1) +
                  value.substring(firstDecimalIndex + 1).replace(/\./g, "");
              }

              // Limit to 8 decimal places (BTC precision)
              const decimalIndex = value.indexOf(".");
              if (
                decimalIndex !== -1 &&
                value.substring(decimalIndex + 1).length > 8
              ) {
                value = value.substring(0, decimalIndex + 9);
              }

              // Prevent leading zeros except for decimal values
              if (value.length > 1 && value[0] === "0" && value[1] !== ".") {
                value = value.substring(1);
              }

              // Update the input field value
              e.currentTarget.value = value;

              if (!value || Big(value).lte(0)) {
                usdRef.current.value = "";
                setUsdAmount("");
                return;
              }

              Big.DP = 2;

              const usdValue = Big(currentPrice).mul(value).toFixed(2);
              usdRef.current.value = usdValue;
              setUsdAmount(usdValue);

              if (!tradingAccountBalance) return;
              updatePercent(
                Big(value)
                  .div(Big(tradingAccountBalanceString))
                  .mul(100)
                  .toNumber()
              );
            }}
            disabled={!isPageLoaded || !tradingAccountBalance}
            autoComplete="off"
          />
        </div>
        <div>
          <Text
            className={cn("mb-1 text-sm opacity-80", width < 350 && "text-xs")}
            asChild
          >
            <label htmlFor="input-market-amount-usd">Amount (USD)</label>
          </Text>

          <Input
            autoComplete="off"
            type="text"
            id="input-market-amount-usd"
            placeholder="$0.00"
            ref={usdRef}
            onChange={(e) => {
              if (!btcRef.current) return;

              const usdInput = e.currentTarget.value;
              setUsdAmount(usdInput);

              if (!usdInput || Big(usdInput).eq(0) || Big(usdInput).lt(0)) {
                btcRef.current.value = "";
                return;
              }
              Big.DP = 8;

              btcRef.current.value = new Big(usdInput)
                .div(currentPrice || 1)
                .toString();
            }}
            disabled={!isPageLoaded || !tradingAccountBalance}
          />
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Slider
          onValueChange={(value) => {
            if (!btcRef.current || !usdRef.current) return;
            const newBtcAmount = new Big(tradingAccountBalanceString)
              .mul(value[0] / 100)
              .toFixed(8);
            btcRef.current.value = newBtcAmount;
            setPercent(value[0]);

            const usdValue = Big(currentPrice).mul(newBtcAmount).toFixed(2);

            usdRef.current.value = usdValue;
            setUsdAmount(usdValue);
          }}
          value={[percent]}
          defaultValue={[1]}
          min={1}
          max={100}
          step={1}
          disabled={!isPageLoaded || !tradingAccountBalance}
        />
        <span className="w-10 text-right text-xs opacity-80">{percent}%</span>
      </div>
      <div>
        <Text
          className={cn("mb-1 text-sm opacity-80", width < 350 && "text-xs")}
          asChild
        >
          <label htmlFor="input-market-leverage">Leverage (x)</label>
        </Text>
        <Input
          autoComplete="off"
          ref={leverageRef}
          onChange={(e) => {
            const value = e.target.value.replace(/[^\d]/, "");

            if (leverageRef.current) {
              if (parseInt(value) > 50) {
                leverageRef.current.value = "50";
                setLeverage("50");
                return;
              }

              if (parseInt(value) < 1) {
                leverageRef.current.value = "1";
                setLeverage("1");
                return;
              }

              leverageRef.current.value = value;
              setLeverage(value);
            }
          }}
          placeholder="1"
          id="input-market-leverage"
          disabled={!isPageLoaded || !tradingAccountBalance}
        />
      </div>

      <Slider
        onValueChange={(value) => {
          if (!leverageRef.current) return;
          leverageRef.current.value = value[0].toString();
          setLeverage(value[0].toString());
        }}
        value={[parseInt(leverage)]}
        defaultValue={[1]}
        min={1}
        max={50}
        step={1}
        disabled={!isPageLoaded || !tradingAccountBalance}
      />
      <div className="flex justify-between">
        <Text className={"mb-1 text-xs opacity-80"}>Position Size (USD)</Text>
        <Text className={"mb-1 text-xs opacity-80"}>${positionSize}</Text>
      </div>

      {status === "Connected" ? (
        <ExchangeResource>
          <div
            className={cn(
              "flex justify-between",
              width < 350 ? "flex-col space-y-2" : "flex-row space-x-4"
            )}
          >
            <Button
              onClick={() => submitMarket("BUY")}
              id="btn-market-buy"
              className="border-green-medium py-2 text-green-medium opacity-70 transition-opacity hover:border-green-medium hover:text-green-medium hover:opacity-100 disabled:opacity-40 disabled:hover:border-green-medium disabled:hover:opacity-40"
              variant="ui"
              disabled={
                isSubmitting ||
                !isPageLoaded ||
                Big(tradingAccountBalance).lte(0)
              }
            >
              {isSubmitting ? (
                <Loader2 className="animate-spin text-primary opacity-60" />
              ) : (
                "Buy"
              )}
            </Button>
            <Button
              onClick={() => submitMarket("SELL")}
              id="btn-market-sell"
              variant="ui"
              className="border-red py-2 text-red opacity-70 transition-opacity hover:border-red hover:text-red hover:opacity-100 disabled:opacity-40 disabled:hover:border-red disabled:hover:opacity-40"
              disabled={
                isSubmitting ||
                !isPageLoaded ||
                Big(tradingAccountBalance).lte(0)
              }
            >
              {isSubmitting ? (
                <Loader2 className="animate-spin text-primary opacity-60" />
              ) : (
                "Sell"
              )}
            </Button>
            {/* <Button
            onClick={() => {
              toast({
                title: "Success",
                description: (
                  <div className="flex items-center space-x-1 opacity-90">
                    <span>Successfully submitted trade order.</span>
                    <Button
                      variant="link"
                      className="inline-flex text-sm opacity-90 hover:opacity-100"
                      asChild
                    >
                      <Link
                        href={`${process.env.NEXT_PUBLIC_EXPLORER_URL as string}/txs/BRCs50fMzA3AW7q0HuzkA`}
                        target={"_blank"}
                      >
                        Explorer link
                      </Link>
                    </Button>
                  </div>
                ),
              });

              addTradeHistory({
                accountAddress: currentZkAccount.address,
                orderStatus: "FILLED",
                orderType: "MARKET",
                tx_hash: "BRCs50fMzA3AW7q0HuzkA",
                uuid: "BRCs50fMzA3AW7q0Hu_zkA",
                value: 100,
                output: "",
                positionType: "LONG",
                date: new Date(),
              });
            }}
          >
            Test
          </Button> */}
          </div>
        </ExchangeResource>
      ) : (
        <div className="flex justify-center">
          <ConnectWallet />
        </div>
      )}
    </form>
  );
};

export default OrderMarketForm;
