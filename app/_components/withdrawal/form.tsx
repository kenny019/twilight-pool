import Button from "@/components/button";
import { Input, PopoverInput } from "@/components/input";
import { Text } from "@/components/typography";
import { useToast } from "@/lib/hooks/useToast";
import BTC, { BTCDenoms } from "@/lib/twilight/denoms";
import { useWallet } from "@cosmos-kit/react-lite";
import Big from "big.js";
import React, { useRef, useState } from "react";
import { twilightproject } from "twilightjs";
import Long from "long";
import { GasPrice, calculateFee } from "@cosmjs/stargate";
import { Loader2 } from "lucide-react";

const BtcWithdrawalForm = () => {
  const { mainWallet } = useWallet();

  const { toast } = useToast();
  const withdrawBtcRef = useRef<HTMLInputElement>(null);
  const depositRef = useRef<HTMLInputElement>(null);
  const [depositDenom, setDepositDenom] = useState<string>("BTC");

  const [isSubmitLoading, setIsSubmitLoading] = useState(false);

  async function submitWithdrawal() {
    if (!depositRef.current?.value) {
      toast({
        variant: "error",
        title: "Error ",
        description: "Invalid BTC amount",
      });
      return;
    }

    if (!mainWallet) {
      console.error("no mainWallet");
      return toast({
        title: "No wallet",
        description: "Please connect your wallet before registration",
        variant: "error",
      });
    }

    const chainWallet = mainWallet.getChainWallet("nyks");

    const withdrawAddress = withdrawBtcRef.current?.value;

    if (!chainWallet || !withdrawAddress) return;

    const twilightAddress = chainWallet.address || "";

    const withdrawAmount = new BTC(
      depositDenom as BTCDenoms,
      Big(depositRef.current.value)
    )
      .convert("sats")
      .toNumber();

    setIsSubmitLoading(true);

    const stargateClient = await chainWallet.getSigningStargateClient();

    const { withdrawBtcRequest } =
      twilightproject.nyks.bridge.MessageComposer.withTypeUrl;

    const msg = withdrawBtcRequest({
      reserveId: Long.fromNumber(1),
      twilightAddress,
      withdrawAddress: withdrawAddress,
      withdrawAmount: Long.fromNumber(withdrawAmount),
    });

    setIsSubmitLoading(false);

    const gasPrice = GasPrice.fromString("1nyks");
    const gasEstimation = await stargateClient.simulate(
      twilightAddress,
      [msg],
      ""
    );

    const fee = calculateFee(Math.round(gasEstimation * 1.3), gasPrice);
    toast({
      title: "Withdraw submitted",
      description: "Please wait while your Bitcoin is being withdrawn...",
    });

    const res = await stargateClient.signAndBroadcast(
      twilightAddress,
      [msg],
      fee
    );

    setIsSubmitLoading(false);
    if (res.code !== 0) {
      toast({
        variant: "error",
        title: "Error",
        description: "There was an error with submitting your withdrawal",
      });
      return;
    }
    console.log("response", res);

    toast({
      title: "Success",
      description: "Your withdrawal request has been successfully sent",
    });

    try {
    } catch (err) {
      console.error(err);
      setIsSubmitLoading(false);
      toast({
        variant: "error",
        title: "Error",
        description: "An error has occurred, try again later.",
      });
    }
  }

  return (
    <form className="space-y-6">
      <Text heading="h2" className="font-medium">
        Withdraw Bitcoin
      </Text>

      <div className="space-y-1">
        <Text asChild>
          <label
            className="text-primary-accent"
            htmlFor="input-btc-deposit-address"
          >
            BTC Wallet Address
          </label>
        </Text>
        <Input id="input-btc-deposit-address" ref={withdrawBtcRef} />
      </div>
      <div className="space-y-1">
        <Text asChild>
          <label className="text-primary-accent" htmlFor="input-btc-amount">
            BTC Amount
          </label>
        </Text>
        <PopoverInput
          id="input-btc-amount"
          name="depositValue"
          onClickPopover={(e) => {
            e.preventDefault();
            if (!depositRef.current?.value) return;

            const toDenom = e.currentTarget.value as BTCDenoms;

            const currentValue = new BTC(
              depositDenom as BTCDenoms,
              Big(depositRef.current.value)
            );

            depositRef.current.value = currentValue.convert(toDenom).toString();
          }}
          type="number"
          step="any"
          placeholder="1.00"
          options={["BTC", "mBTC", "sats"]}
          setSelected={setDepositDenom}
          selected={depositDenom}
          ref={depositRef}
        />
      </div>
      <Button
        onClick={(e) => {
          e.preventDefault();
          submitWithdrawal();
        }}
      >
        {isSubmitLoading ? (
          <Loader2 className="animate-spin text-primary opacity-60" />
        ) : (
          "Withdraw"
        )}
      </Button>
    </form>
  );
};

export default BtcWithdrawalForm;
