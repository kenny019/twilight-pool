import Button from "@/components/button";
import { Input, PopoverInput } from "@/components/input";
import { Text } from "@/components/typography";
import { useToast } from "@/lib/hooks/useToast";
import BTC, { BTCDenoms } from "@/lib/twilight/denoms";
import { isUserRejection } from "@/lib/helpers";
import { useWallet } from "@cosmos-kit/react-lite";
import Big from "big.js";
import React, { useRef, useState } from "react";
import useGetRegisteredBTCAddress from "@/lib/hooks/useGetRegisteredBtcAddress";
import { twilightproject } from "twilightjs";
import Long from "long";
import { GasPrice, calculateFee } from "@cosmjs/stargate";
import { Loader2 } from "lucide-react";
import BtcReserveSelect from "../btc-reserve-select";
import useGetTwilightBTCBalance from "@/lib/hooks/useGetTwilightBtcBalance";
import { useTwilightStore } from "@/lib/providers/store";
import FeeEstimate from "./fee-estimate";
import { assertCosmosTxSuccess } from "@/lib/utils/cosmosTx";

const BtcWithdrawalForm = () => {
  const { mainWallet } = useWallet();
  const chainWallet = mainWallet?.getChainWallet("nyks");
  const twilightAddress = chainWallet?.address;

  const { data: registeredBtcData, isLoading: isBtcAddressLoading } =
    useGetRegisteredBTCAddress(twilightAddress);

  const { toast } = useToast();

  const { twilightSats } = useGetTwilightBTCBalance();
  const addWithdrawal = useTwilightStore(
    (state) => state.withdraw.addWithdrawal
  );

  const depositRef = useRef<HTMLInputElement>(null);

  const [selectedReserveId, setSelectedReserveId] = useState<
    number | undefined
  >();
  const [depositDenom, setDepositDenom] = useState<string>("BTC");
  const [withdrawAmount, setWithdrawAmount] = useState<string>("");
  const [isSubmitLoading, setIsSubmitLoading] = useState(false);

  let amountSats = 0;
  try {
    if (withdrawAmount && withdrawAmount !== "." && withdrawAmount !== "-") {
      amountSats = new BTC(depositDenom as BTCDenoms, Big(withdrawAmount))
        .convert("sats")
        .toNumber();
    }
  } catch {
    // invalid input — keep 0
  }

  const maxValueString =
    twilightSats > 0
      ? new BTC("sats", Big(twilightSats))
          .convert(depositDenom as BTCDenoms)
          .toString()
      : "0.00000000";

  async function submitWithdrawal() {
    try {
      if (!depositRef.current?.value) {
        toast({
          variant: "error",
          title: "Error",
          description: "Invalid BTC amount",
        });
        return;
      }

      if (selectedReserveId === undefined) {
        toast({
          variant: "error",
          title: "Error",
          description: "Please select a reserve",
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

      const withdrawAddress = registeredBtcData?.depositAddress;

      if (!chainWallet || !withdrawAddress || !twilightAddress) return;

      const withdrawSats = new BTC(
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
        reserveId: Long.fromNumber(selectedReserveId),
        twilightAddress,
        withdrawAddress: withdrawAddress,
        withdrawAmount: Long.fromNumber(withdrawSats),
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

      const res = assertCosmosTxSuccess(
        await stargateClient.signAndBroadcast(
          twilightAddress,
          [msg],
          // fee
          100
        ),
        "BTC withdrawal request"
      );

      setIsSubmitLoading(false);
      console.log("response", res);

      addWithdrawal({
        tx_hash: res.transactionHash,
        created_at: Date.now(),
        status: "queued",
        amount: withdrawSats,
        withdrawAddress,
        reserveId: selectedReserveId,
      });

      toast({
        title: "Success",
        description: "Your withdrawal request has been successfully sent",
      });
    } catch (err) {
      if (isUserRejection(err)) {
        toast({
          title: "Transaction rejected",
          description: "You declined the transaction in your wallet.",
        });
        setIsSubmitLoading(false);
        return;
      }
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
    <div className="rounded-lg border bg-background p-6">
      <form className="space-y-4">
        <Text heading="h2" className="text-2xl font-medium sm:text-3xl">
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
          <Input
            id="input-btc-deposit-address"
            value={registeredBtcData?.depositAddress ?? ""}
            readOnly
          />
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <Text asChild>
              <label className="text-primary-accent" htmlFor="input-btc-amount">
                BTC Amount
              </label>
            </Text>
            <label
              onClick={() => {
                if (depositRef.current) {
                  depositRef.current.value = maxValueString;
                  setWithdrawAmount(maxValueString);
                }
              }}
              className="cursor-pointer select-none text-xs text-primary opacity-60 hover:opacity-100"
            >
              MAX: {maxValueString}
            </label>
          </div>
          <PopoverInput
            id="input-btc-amount"
            name="depositValue"
            onChange={(e) => setWithdrawAmount(e.target.value)}
            onClickPopover={(e) => {
              e.preventDefault();
              if (!depositRef.current?.value) return;

              const toDenom = e.currentTarget.value as BTCDenoms;

              const currentValue = new BTC(
                depositDenom as BTCDenoms,
                Big(depositRef.current.value)
              );

              const converted = currentValue.convert(toDenom).toString();
              depositRef.current.value = converted;
              setWithdrawAmount(converted);
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

        <div className="space-y-1">
          <Text asChild>
            <label className="text-primary-accent" htmlFor="select-reserve-id">
              Select BTC Reserve
            </label>
          </Text>
          <BtcReserveSelect
            id="select-reserve-id"
            value={selectedReserveId}
            onValueChange={setSelectedReserveId}
          />
        </div>
        {amountSats > 0 && (
          <FeeEstimate
            amountSats={amountSats}
            displayDenom={depositDenom as BTCDenoms}
          />
        )}
        <Button
          disabled={
            isSubmitLoading ||
            isBtcAddressLoading ||
            !registeredBtcData?.depositAddress ||
            !registeredBtcData?.isConfirmed
          }
          className="!mt-12 w-full bg-primary text-background hover:bg-primary/90"
          onClick={(e) => {
            e.preventDefault();
            submitWithdrawal();
          }}
        >
          {isSubmitLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            "Withdraw"
          )}
        </Button>
      </form>
    </div>
  );
};

export default BtcWithdrawalForm;
