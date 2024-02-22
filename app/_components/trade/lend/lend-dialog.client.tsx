"use client";
import Button from "@/components/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/dialog";
import { PopoverInput } from "@/components/input";
import Resource from "@/components/resource";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/select";
import { Text } from "@/components/typography";
import { sendLendOrder } from "@/lib/api/client";
import { useToast } from "@/lib/hooks/useToast";
import { useSessionStore } from "@/lib/providers/session";
import { useTwilightStore } from "@/lib/providers/store";
import { useTwilight } from "@/lib/providers/twilight";
import BTC, { BTCDenoms } from "@/lib/twilight/denoms";
import { createZkLendOrder } from "@/lib/twilight/zk";
import Big from "big.js";
import { Loader2 } from "lucide-react";
import React, { useRef, useState } from "react";

type Props = {
  children: React.ReactNode;
};

const LendDialog = ({ children }: Props) => {
  const { toast } = useToast();
  const privateKey = useSessionStore((state) => state.privateKey);

  const zkAccounts = useTwilightStore((state) => state.zk.zkAccounts);
  const addLendOrder = useTwilightStore((state) => state.lend.addLend);

  const [selectedAccountIndex, setSelectedAccountIndex] = useState(0);
  const [depositDenom, setDepositDenom] = useState<string>("BTC");
  const [isSubmitLoading, setIsSubmitLoading] = useState(false);

  const depositRef = useRef<HTMLInputElement>(null);

  const selectedZkAccount = zkAccounts[selectedAccountIndex];

  async function submitForm(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!depositRef.current?.value) {
      toast({
        variant: "error",
        title: "Error ",
        description: "Invalid BTC amount",
      });
      return;
    }

    const depositAmount = new BTC(
      depositDenom as BTCDenoms,
      Big(depositRef.current.value)
    )
      .convert("sats")
      .toNumber();

    setIsSubmitLoading(true);

    const { success, msg } = await createZkLendOrder({
      zkAccount: selectedZkAccount,
      deposit: depositAmount,
      signature: privateKey,
    });

    if (!success || !msg) {
      toast({
        variant: "error",
        title: "Unable to submit lend order",
        description: "An error has occurred, try again later.",
      });
      setIsSubmitLoading(false);
      return;
    }

    const data = await sendLendOrder(msg);

    if (data.result && data.result.id_key) {
      console.log(data);
      toast({
        title: "Success",
        description: "Successfully submitted lend order",
      });

      addLendOrder({
        accountAddress: selectedZkAccount.address,
        uuid: data.result.id_key as string,
        orderStatus: "",
        value: depositAmount,
      });
    } else {
      toast({
        variant: "error",
        title: "Unable to submit lend order",
        description: "An error has occurred, try again later.",
      });
    }

    setIsSubmitLoading(false);
  }

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="left-auto right-0 min-h-screen max-w-2xl translate-x-0 rounded-none border-r-0">
        <DialogTitle>Lend</DialogTitle>
        <form onSubmit={submitForm} className="max-w-sm space-y-4">
          <div className="space-y-1">
            <Text className="text-xs text-primary-accent" asChild>
              <label htmlFor="dropdown-trading-account-from">
                Account from
              </label>
            </Text>

            <Select
              defaultValue={selectedAccountIndex.toString()}
              value={selectedAccountIndex.toString()}
              onValueChange={(val) => setSelectedAccountIndex(parseInt(val))}
            >
              <SelectTrigger
                id="dropdown-account-lend-from"
                className="w-[180px]"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {zkAccounts.map((subAccount, index) => {
                  return (
                    <SelectItem
                      value={index.toString()}
                      key={subAccount.address}
                    >
                      {subAccount.tag === "main"
                        ? "Trading Account"
                        : subAccount.tag}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Text className="text-xs text-primary-accent" asChild>
              <label htmlFor="dropdown-trading-account-from">Sats Amount</label>
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

                depositRef.current.value = currentValue
                  .convert(toDenom)
                  .toString();
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

          <Button disabled={isSubmitLoading} type="submit" size="small">
            <Resource
              isLoaded={!isSubmitLoading}
              placeholder={<Loader2 className="animate-spin" />}
            >
              Deposit
            </Resource>
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default LendDialog;
