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
import { Text } from "@/components/typography";
import { sendTradeOrder } from "@/lib/api/client";
import { queryTransactionHashes } from "@/lib/api/rest";
import cn from "@/lib/cn";
import { retry } from "@/lib/helpers";
import { useToast } from "@/lib/hooks/useToast";
import { useGrid } from "@/lib/providers/grid";
import { useSessionStore } from "@/lib/providers/session";
import { useTwilightStore } from "@/lib/providers/store";
import BTC from "@/lib/twilight/denoms";
import { createZkOrder } from "@/lib/twilight/zk";
import { useWallet } from "@cosmos-kit/react-lite";
import Big from "big.js";
import { ChevronDown, Loader2 } from "lucide-react";
import Link from "next/link";
import React, { SyntheticEvent, useRef, useState } from "react";

const limitQtyOptions = [25, 50, 75, 100];

const OrderLimitForm = () => {
  const { width } = useGrid();
  const { toast } = useToast();

  const btcAmountRef = useRef<HTMLInputElement>(null);
  const leverageRef = useRef<HTMLInputElement>(null);

  const [orderPrice, setOrderPrice] = useState(0);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const { status } = useWallet();

  const addTradeHistory = useSessionStore((state) => state.trade.addTrade);
  const privateKey = useSessionStore((state) => state.privateKey);

  const addTrade = useTwilightStore((state) => state.trade.addTrade);
  const zkAccounts = useTwilightStore((state) => state.zk.zkAccounts);
  const selectedZkAccount = useTwilightStore(
    (state) => state.zk.selectedZkAccount
  );

  const currentZkAccount = zkAccounts[selectedZkAccount];

  async function submitLimitOrder(
    e: SyntheticEvent<HTMLFormElement, SubmitEvent>
  ) {
    e.preventDefault();

    if (!currentZkAccount) return;

    try {
      const submitter = e.nativeEvent.submitter as HTMLButtonElement;

      const action = submitter.value as "sell" | "buy";

      const btcAmountInSats = new BTC(
        "BTC",
        Big(btcAmountRef.current?.value as string)
      )
        .convert("sats")
        .toNumber();

      const currentAccountValue = currentZkAccount.value || 0;

      if (btcAmountInSats > currentAccountValue) {
        throw `Insufficient balance to place order for ${
          btcAmountRef.current?.value || 0
        } BTC`;
      }

      const leverage = parseInt(leverageRef.current?.value || "1");
      const positionType = action === "sell" ? "SHORT" : "LONG";

      const { success, msg } = await createZkOrder({
        leverage: leverage,
        orderType: "LIMIT",
        positionType,
        signature: privateKey,
        timebounds: 1,
        zkAccount: currentZkAccount,
        value: btcAmountInSats,
        entryPrice: orderPrice,
      });

      setIsSubmitting(false);

      if (!success || !msg) {
        throw "Error with creating limit order";
      }

      toast({
        title: "Submitting order",
        description: "Order is being submitted...",
      });

      const data = await sendTradeOrder(msg);

      if (!data.result || data.result.id_key) {
        throw "Error with creating limit order";
      }

      const transactionHashCondition = (
        txHashResult: Awaited<ReturnType<typeof queryTransactionHashes>>
      ) => {
        if (txHashResult.result) {
          const transactionHashes = txHashResult.result;

          let txResult = true;
          transactionHashes.forEach((result) => {
            if (result.tx_hash.includes("Error")) {
              return false;
            }
          });

          return txResult;
        }
        return false;
      };

      const transactionHashRes = await retry<
        ReturnType<typeof queryTransactionHashes>,
        string
      >(
        queryTransactionHashes,
        9,
        currentZkAccount.address,
        1500,
        transactionHashCondition
      );

      if (!transactionHashRes.success) {
        throw "Unable to get tx hash of order";
      }

      const orderData = transactionHashRes.data.result[0];

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
                href={`https://nyks.twilight-explorer.com/transaction/${orderData.tx_hash}`}
                target={"_blank"}
              >
                Explorer link
              </Link>
            </Button>
          </div>
        ),
      });

      addTrade({
        accountAddress: currentZkAccount.address,
        orderStatus: orderData.order_status,
        positionType,
        orderType: orderData.order_type,
        tx_hash: orderData.tx_hash,
        uuid: orderData.order_id,
        value: btcAmountInSats,
        output: orderData.output,
      });

      addTradeHistory({
        accountAddress: currentZkAccount.address,
        orderStatus: orderData.order_status,
        orderType: orderData.order_type,
        positionType,
        tx_hash: orderData.tx_hash,
        uuid: orderData.order_id,
        value: btcAmountInSats,
        output: orderData.output,
        date: new Date(),
      });
    } catch (err) {
      if (typeof err === "string") {
        toast({
          variant: "error",
          title: "Error creating limit order",
          description: err,
        });
        return;
      }
    }
  }

  return (
    <form onSubmit={submitLimitOrder} className="flex flex-col space-y-3 px-3">
      <div>
        <Text className="mb-1 text-xs opacity-80" asChild>
          <label htmlFor="input-order-price">Order Price</label>
        </Text>
        <div className="flex flex-row space-x-2">
          <NumberInput
            inputValue={orderPrice}
            setInputValue={setOrderPrice}
            id="input-order-price"
            name="price"
          />
        </div>
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

                    if (!currentZkAccount || !currentZkAccount.value) {
                      btcAmountRef.current.value = "0";
                      return;
                    }

                    btcAmountRef.current.value = new BTC(
                      "sats",
                      Big(currentZkAccount.value).mul(value).div(100)
                    )
                      .convert("BTC")
                      .toString();
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
            ref={btcAmountRef}
            id="input-order-amount"
            type="number"
            placeholder="BTC Amount"
            step="any"
            name="btc"
          />
          <label
            className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-primary-accent"
            htmlFor="input-order-amount"
          >
            BTC
          </label>
        </div>
      </div>

      <div>
        <label className="text-xs opacity-80" htmlFor="input-limit-leverage">
          Leverage (x)
        </label>
        <Input
          ref={leverageRef}
          onChange={(e) => {
            const value = e.target.value.replace(/[^\d]/, "");

            if (leverageRef.current) {
              if (parseInt(value) > 50) {
                leverageRef.current.value = "50";
                return;
              }

              if (parseInt(value) < 1) {
                leverageRef.current.value = "1";
                return;
              }

              leverageRef.current.value = value;
            }
          }}
          placeholder="1"
          id="input-limit-leverage"
        />
      </div>

      {status === "Connected" ? (
        <div
          className={cn(
            "flex justify-between",
            width < 350 ? "flex-col space-y-2" : "flex-row space-x-4"
          )}
        >
          <ExchangeResource>
            <Button
              className="border-green-medium py-2 text-green-medium opacity-70 transition-opacity hover:border-green-medium hover:text-green-medium hover:opacity-100"
              variant="ui"
              disabled={isSubmitting}
              type={"submit"}
              value={"buy"}
              // onClick={async () => {
              //   const { success, msg } = await createZkOrder({
              //     zkAccount: currentZkAccount,
              //     signature: privateKey,
              //     value: 100,
              //     positionType: "LONG",
              //     leverage: 1,
              //     orderType: "MARKET",
              //     timebounds: 0,
              //     entryPrice: 0,
              //   });

              //   if (!success || !msg)
              //     return console.error("error creating zk order");

              //   console.log("txString", msg);
              //   const data = await sendTradeOrder(msg);
              //   console.log(data);
              // }}
            >
              {isSubmitting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>Buy</>
              )}
            </Button>
          </ExchangeResource>
          <ExchangeResource>
            <Button
              variant="ui"
              className="border-red py-2 text-red opacity-70 transition-opacity hover:border-red hover:text-red hover:opacity-100"
              disabled={isSubmitting}
              type={"submit"}
              value={"sell"}
            >
              {isSubmitting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>Sell</>
              )}
            </Button>
          </ExchangeResource>
        </div>
      ) : (
        <div className="flex w-full justify-center">
          <ConnectWallet />
        </div>
      )}
    </form>
  );
};

export default OrderLimitForm;
