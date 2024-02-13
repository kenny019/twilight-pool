import Button from "@/components/button";
import ExchangeResource from "@/components/exchange-resource";
import { Input } from "@/components/input";
import { Text } from "@/components/typography";
import { sendTradeOrder } from "@/lib/api/client";
import cn from "@/lib/cn";
import { useToast } from "@/lib/hooks/useToast";
import { usePriceFeed } from "@/lib/providers/feed";
import { useGrid } from "@/lib/providers/grid";
import { useTwilight } from "@/lib/providers/twilight";
import { useAccountStore } from "@/lib/state/store";
import BTC from "@/lib/twilight/denoms";
import { createZkOrder } from "@/lib/twilight/zk";
import { WalletStatus } from "@cosmos-kit/core";
import { useWallet } from "@cosmos-kit/react-lite";
import Big from "big.js";
import { Loader2 } from "lucide-react";
import React, { useRef, useState } from "react";

const OrderMarketForm = () => {
  const { width } = useGrid();
  // todo: fix bug with ref getting reset on window size change

  const { hasRegisteredBTC, quisPrivateKey } = useTwilight();

  const { currentPrice } = usePriceFeed();

  const { toast } = useToast();

  const { status } = useWallet();

  const btcRef = useRef<HTMLInputElement>(null);
  const usdRef = useRef<HTMLInputElement>(null);

  const zKAccounts = useAccountStore((state) => state.zk.zkAccounts);
  const selectedZkAccount = useAccountStore(
    (state) => state.zk.selectedZkAccount
  );

  const currentZkAccount = zKAccounts[selectedZkAccount];

  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submitMarket(type: "SELL" | "BUY") {
    if (!hasRegisteredBTC) return;
    const btcValue = btcRef.current?.value;

    if (!btcValue) {
      toast({
        variant: "error",
        title: "Missing BTC value",
        description: "Please enter a valid value",
      });
      return;
    }

    const satsValue = new BTC("BTC", Big(btcValue)).convert("sats").toNumber();

    setIsSubmitting(true);

    const { success, msg } = await createZkOrder({
      leverage: 1,
      orderType: "MARKET",
      positionType: type === "BUY" ? "LONG" : "SHORT",
      signature: quisPrivateKey,
      timebounds: 1,
      zkAccount: currentZkAccount,
      value: satsValue,
    });

    if (!success || !msg) {
      toast({
        variant: "error",
        title: "Unable to submit trade order",
        description: "An error has occurred, try again later.",
      });
      setIsSubmitting(false);
      return;
    }

    const data = await sendTradeOrder(msg);

    if (data.result && data.result.id_key) {
      console.log(data);
      toast({
        title: "Success",
        description: "Successfully submitted trade order",
      });
    } else {
      toast({
        variant: "error",
        title: "Unable to submit trade order",
        description: "An error has occurred, try again later.",
      });
    }
    setIsSubmitting(false);
    // todo: get this data and put it into "my trades"
  }

  return (
    <form
      onSubmit={(e) => e.preventDefault()}
      className="flex flex-col space-y-3 px-3"
    >
      <div className="flex justify-between space-x-4">
        <div>
          <Text
            className={cn("mb-1 text-sm opacity-80", width < 350 && "text-xs")}
            asChild
          >
            <label htmlFor="input-market-amount-btc">Amount (BTC)</label>
          </Text>
          <Input
            type="number"
            id="input-market-amount-btc"
            placeholder="0.000"
            ref={btcRef}
            onChange={(e) => {
              if (!usdRef.current) return;

              if (!e.currentTarget.value || Big(e.currentTarget.value).lt(0)) {
                usdRef.current.value = "";
                return;
              }

              Big.DP = 2;

              usdRef.current.value = Big(currentPrice)
                .mul(e.currentTarget.value)
                .toString();
            }}
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
            type="number"
            id="input-market-amount-usd"
            placeholder="$0.00"
            ref={usdRef}
            onChange={(e) => {
              if (!btcRef.current) return;

              if (
                !e.currentTarget.value ||
                Big(e.currentTarget.value).eq(0) ||
                Big(e.currentTarget.value).lt(0)
              ) {
                btcRef.current.value = "";
                return;
              }
              Big.DP = 8;

              const usdInput = e.currentTarget.value;
              btcRef.current.value = new Big(usdInput)
                .div(currentPrice || 1)
                .toString();
            }}
          />
        </div>
      </div>
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
            disabled={isSubmitting || status === WalletStatus.Disconnected}
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
            disabled={isSubmitting || status === WalletStatus.Disconnected}
          >
            {isSubmitting ? (
              <Loader2 className="animate-spin text-primary opacity-60" />
            ) : (
              "Sell"
            )}
          </Button>
        </div>
      </ExchangeResource>
    </form>
  );
};

export default OrderMarketForm;
