import ConnectWallet from "@/app/_components/layout/connect-wallet.client";
import Button from "@/components/button";
import {
  DropdownContent,
  DropdownGroup,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
} from "@/components/dropdown";
import ExchangeResource from "@/components/exchange-resource";
import { Input, NumberInput } from "@/components/input";
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
import BTC from "@/lib/twilight/denoms";
import { formatCurrency } from "@/lib/twilight/ticker";
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
import { useWallet } from "@cosmos-kit/react-lite";
import Big from "big.js";
import dayjs from "dayjs";
import { ArrowLeftRight, ChevronDown, Loader2 } from "lucide-react";
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

const limitQtyOptions = [25, 50, 75, 100];
const LIMIT_BUFFER = 0.001;

const OrderLimitForm = () => {
  const { width } = useGrid();
  const { toast } = useToast();
  const marketStats = useGetMarketStats();

  // Raw store API — lets queue tasks read the latest state at execution time
  // instead of relying on a potentially-stale React closure.
  const storeApi = useTwilightStoreApi();

  const btcAmountRef = useRef<HTMLInputElement>(null);
  const leverageRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [leverage, setLeverage] = useState<string>("1");
  const [percent, setPercent] = useState<number>(0);

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

  const currentPrice = liveBtcPrice || storedBtcPrice; // binance websocket stream does not work for USA Ip address

  const [orderPrice, setOrderPrice] = useState(currentPrice || 0);

  const [orderSats, setOrderSats] = useState(0);

  const positionSize = useMemo(() => {
    if (!orderPrice || !leverage || !orderSats) {
      return "0.00";
    }

    try {
      const usdAmountBig = Big(orderPrice || "0");
      const leverageBig = Big(leverage || "1");

      const btcValue = new BTC("sats", Big(orderSats))
        .convert("BTC")
        .toNumber();
      const psize = Big(btcValue).mul(usdAmountBig);

      if (leverageBig.lte(0)) {
        return "0.00";
      }

      Big.DP = 2;

      return new Intl.NumberFormat("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(Number(psize.mul(leverageBig).toFixed(2)));
    } catch (error) {
      console.error("Error calculating position size:", error);
      return "0.00";
    }
  }, [orderPrice, leverage, orderSats]);

  const positionSizeBtc = useMemo(() => {
    if (!orderSats || !leverage) return "0";
    try {
      const leverageBig = Big(leverage || "1");
      if (leverageBig.lte(0)) return "0";
      const totalSats = Big(orderSats).mul(leverageBig);
      return BTC.format(new BTC("sats", totalSats).convert("BTC"), "BTC");
    } catch {
      return "0";
    }
  }, [orderSats, leverage]);

  const liquidationPrices = useMemo(() => {
    if (!orderPrice || !leverage || !orderSats || orderPrice <= 0) {
      return { long: "0.00", short: "0.00" };
    }

    try {
      const btcValue = new BTC("sats", Big(orderSats))
        .convert("BTC")
        .toNumber();
      // initial margin in USD = btc amount * order price
      const initialMargin = Big(btcValue).mul(orderPrice);
      const leverageBig = Big(leverage || "1");
      const entryPrice = Big(orderPrice);

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
  }, [orderPrice, leverage, orderSats]);

  const { status, mainWallet } = useWallet();

  const privateKey = useSessionStore((state) => state.privateKey);
  const updateZkAccount = useTwilightStore((state) => state.zk.updateZkAccount);
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

  async function submitLimitOrder(
    e: SyntheticEvent<HTMLFormElement, SubmitEvent>
  ) {
    e.preventDefault();
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

    const twilightAddress = chainWallet.address;

    if (!twilightAddress || !tradingAccount) {
      console.error("unexpected error");
      return;
    }

    try {
      const submitter = e.nativeEvent.submitter as HTMLButtonElement;

      const action = submitter.value as "sell" | "buy";

      const btcAmountInSats = Math.floor(
        new BTC("BTC", Big(btcAmountRef.current?.value as string))
          .convert("sats")
          .toNumber()
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
          title: "Invalid amount",
          description: "Please enter an amount greater than 0.00001 BTC.",
        });
        return;
      }

      if (orderPrice <= 0) {
        throw `Unable to create limit order with price lower than 0`;
      }

      const leverageVal = parseInt(leverageRef.current?.value || "1");
      const positionType = action === "sell" ? "SHORT" : "LONG";

      // Validate limit price vs mark price (0.1% buffer)
      if (currentPrice > 0) {
        if (positionType === "LONG" && orderPrice >= currentPrice * (1 - LIMIT_BUFFER)) {
          toast({
            variant: "error",
            title: "Invalid limit price",
            description: `For a Buy (Long) order, the limit price must be below the mark price (${formatCurrency(currentPrice)}). Lower the price so your order fills when the market dips to it.`,
          });
          setIsSubmitting(false);
          return;
        }
        if (positionType === "SHORT" && orderPrice <= currentPrice * (1 + LIMIT_BUFFER)) {
          toast({
            variant: "error",
            title: "Invalid limit price",
            description: `For a Sell (Short) order, the limit price must be above the mark price (${formatCurrency(currentPrice)}). Raise the price so your order fills when the market rises to it.`,
          });
          setIsSubmitting(false);
          return;
        }
      }

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

      // Generate the new order account before entering the queue — this is
      // pure in-memory work and does not touch the master UTXO.
      const { account: newTradingAccount } = await createZkAccountWithBalance({
        tag: "limit",
        balance: btcAmountInSats,
        signature: privateKey,
      });

      const tag = `BTC ${action} ${newTradingAccount.address.slice(0, 6)}`;

      // --- Master-account critical section (serialised via queue) -----------
      let queueResult: { newZkAccount: ZkAccount; txId: string };
      try {
        queueResult = await masterAccountQueue.enqueue(async () => {
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

          const utxoWait = await waitForUtxoUpdate(
            senderZkPrivateAccount.get().address,
            previousTxid
          );
          if (!utxoWait.success) {
            console.warn("waitForUtxoUpdate timed out:", utxoWait.message);
          }

          const newZkAccount: ZkAccount = {
            scalar: updatedTradingAccountScalar,
            type: "Coin",
            address: updatedTradingAccountAddress,
            tag,
            isOnChain: true,
            value: btcAmountInSats,
            createdAt: dayjs().unix(),
          };

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
        orderType: "LIMIT",
        positionType,
        signature: privateKey,
        timebounds: 1,
        zkAccount: newZkAccount as ZkAccount,
        value: btcAmountInSats,
        entryPrice: orderPrice,
      });

      if (!success || !msg) {
        console.error("limit msg error");
        throw "Error with creating limit order";
      }

      const data = await sendTradeOrder(
        msg,
        optInLeaderboard ? twilightAddress : undefined
      );

      if (!data.result || !data.result.id_key) {
        console.error("sendTradeOrderResult", data);
        throw "Error with creating limit order";
      }

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
            description: "Unable to get tx hash of order",
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
          description: "Unable to get tx hash of order",
        });
        return;
      }

      console.log("orderData", orderData);

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
        tx_hash: orderData.order_status === "PENDING" ? "" : orderData.tx_hash,
        uuid: orderData.order_id,
        value: btcAmountInSats,
        output: orderData.output,
        entryPrice: new Big(traderOrderInfo.entryprice).toNumber(),
        leverage: leverage,
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
            Successfully placed limit order.{" "}
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
      setLeverage("1");
      setPercent(0);
      setOrderSats(0);
      setOrderPrice(currentPrice);
      if (btcAmountRef.current) btcAmountRef.current.value = "";
      if (leverageRef.current) leverageRef.current.value = "";
    } catch (err) {
      if (typeof err === "string") {
        toast({
          variant: "error",
          title: "Error creating limit order",
          description: err,
        });
        return;
      }
    } finally {
      setIsSubmitting(false);
    }
  }
  // Buy (Long): price must be below mark. Disable Buy when price >= mark - buffer.
  const buyDisabled =
    currentPrice > 0 && orderPrice > 0
      ? orderPrice >= currentPrice * (1 - LIMIT_BUFFER)
      : false;
  // Sell (Short): price must be above mark. Disable Sell when price <= mark + buffer.
  const sellDisabled =
    currentPrice > 0 && orderPrice > 0
      ? orderPrice <= currentPrice * (1 + LIMIT_BUFFER)
      : false;

  return (
    <form onSubmit={submitLimitOrder} className="flex flex-col space-y-2 px-3">
      <div className="flex justify-between text-xs">
        <span className="opacity-80">Avbl to trade</span>
        <span>{tradingAccountBalanceString} BTC</span>
      </div>
      <div className="flex justify-between text-xs">
        {!buyDisabled && (
          <span className="text-green-medium">
            Liq. Price (Long) ≈ ${liquidationPrices.long}
          </span>
        )}
        {!sellDisabled && (
          <span className="text-red">
            Liq. Price (Short) ≈ ${liquidationPrices.short}
          </span>
        )}
      </div>
      {/* <Button className="flex flex-row items-center justify-center gap-4 text-xs">
        Funding<ArrowLeftRight />Trading
      </Button> */}
      <div>
        <Text className="mb-1 text-xs opacity-80" asChild>
          <label htmlFor="input-order-price">Order Price</label>
        </Text>
        <div className="flex flex-row space-x-2">
          <NumberInput
            defaultValue={currentPrice}
            inputValue={orderPrice}
            setInputValue={setOrderPrice}
            id="input-order-price"
            name="price"
            currentPrice={currentPrice}
            disabled={!tradingAccountBalance}
          />
        </div>
        {currentPrice > 0 && (
          <div className="mt-0.5 flex flex-col gap-0.5 text-xs text-primary-accent/70">
            <span><span className="text-green-medium">Buy (Long):</span> limit price must be below {formatCurrency(currentPrice)}</span>
            <span><span className="text-red">Sell (Short):</span> limit price must be above {formatCurrency(currentPrice)}</span>
          </div>
        )}
      </div>
      <div>
        <DropdownMenu>
          <DropdownTrigger className="group">
            <Text className="mb-1 flex cursor-pointer items-center gap-1 text-xs opacity-80">
              Order by Qty
              <ChevronDown className="h-3 w-3 transition-all group-data-[state=open]:-rotate-180" />
            </Text>
          </DropdownTrigger>
          <DropdownContent className="mt-1 before:mt-[3px]">
            <DropdownGroup>
              {limitQtyOptions.map((value) => (
                <DropdownItem
                  key={value}
                  className="hover:bg-primary hover:text-button-secondary"
                  onClick={() => {
                    if (!btcAmountRef.current) return;

                    if (!tradingAccountBalance) {
                      btcAmountRef.current.value = "0";
                      return;
                    }

                    const newOrderSats = Big(tradingAccountBalance)
                      .mul(value)
                      .div(100);

                    btcAmountRef.current.value = new BTC(
                      "sats",
                      Big(tradingAccountBalance).mul(value).div(100)
                    )
                      .convert("BTC")
                      .toString();

                    setOrderSats(newOrderSats.toNumber());
                    setPercent(value);
                  }}
                >
                  {value}%
                </DropdownItem>
              ))}
            </DropdownGroup>
          </DropdownContent>
        </DropdownMenu>

        <div className="relative">
          <Input
            autoComplete="off"
            ref={btcAmountRef}
            id="input-order-amount"
            type="number"
            placeholder="BTC Amount"
            step="any"
            name="btc"
            onChange={(e) => {
              if (!e.target.value) {
                setPercent(0);
                return;
              }

              try {
                const convertedToSats = new BTC("BTC", Big(e.target.value))
                  .convert("sats")
                  .toNumber();
                setOrderSats(convertedToSats);

                if (!tradingAccountBalance) return;
                updatePercent(
                  Big(e.target.value)
                    .div(Big(tradingAccountBalanceString))
                    .mul(100)
                    .toNumber()
                );
              } catch {}
            }}
            disabled={!tradingAccountBalance}
          />
          <label
            className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-primary-accent"
            htmlFor="input-order-amount"
          >
            BTC
          </label>
        </div>

        <div className="mt-1 flex items-center space-x-2">
          <Slider
            onValueChange={(value) => {
              if (!btcAmountRef.current) return;
              const newBtcAmount = new Big(tradingAccountBalanceString)
                .mul(value[0] / 100)
                .toFixed(8);
              btcAmountRef.current.value = newBtcAmount;

              const convertedToSats = new BTC("BTC", Big(newBtcAmount))
                .convert("sats")
                .toNumber();
              setOrderSats(convertedToSats);

              setPercent(value[0]);
            }}
            value={[percent]}
            defaultValue={[1]}
            min={1}
            max={100}
            step={1}
            disabled={!tradingAccountBalance}
          />
          <span className="w-10 text-right text-xs opacity-80">{percent}%</span>
        </div>
      </div>

      <div>
        <label className="text-xs opacity-80" htmlFor="input-limit-leverage">
          Leverage (x)
        </label>
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
          id="input-limit-leverage"
          disabled={!tradingAccountBalance}
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
        disabled={!tradingAccountBalance}
      />

      <div className="flex justify-between">
        <Text className={"mb-1 text-xs opacity-80"}>Position Size (USD)</Text>
        <Text className={"mb-1 text-xs opacity-80"}>${positionSize}</Text>
      </div>
      <div className="flex justify-between">
        <Text className={"mb-1 text-xs opacity-80"}>Position Size (BTC)</Text>
        <Text className={"mb-1 text-xs opacity-80"}>{positionSizeBtc} BTC</Text>
      </div>

      {status === "Connected" ? (
        <ExchangeResource>
          <div className="flex flex-row gap-2">
            <Button
              className="flex-1 border-green-medium py-2 text-green-medium opacity-70 transition-opacity hover:border-green-medium hover:text-green-medium hover:opacity-100 disabled:opacity-40 disabled:hover:border-green-medium disabled:hover:opacity-40"
              variant="ui"
              type={"submit"}
              value={"buy"}
              disabled={isSubmitting || Big(tradingAccountBalance).lte(0) || buyDisabled}
            >
              {isSubmitting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>Buy</>
              )}
            </Button>
            <Button
              variant="ui"
              className="flex-1 border-red py-2 text-red opacity-70 transition-opacity hover:border-red hover:text-red hover:opacity-100 disabled:opacity-40 disabled:hover:border-red disabled:hover:opacity-40"
              disabled={isSubmitting || Big(tradingAccountBalance).lte(0) || sellDisabled}
              type={"submit"}
              value={"sell"}
            >
              {isSubmitting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>Sell</>
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
