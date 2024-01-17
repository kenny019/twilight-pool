import Button from "@/components/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/dialog";
import { PopoverInput } from "@/components/input";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/select";
import { Text } from "@/components/typography";
import { useSubaccount } from "@/lib/providers/subaccounts";
import BTC, { BTCDenoms } from "@/lib/twilight/denoms";
import Big from "big.js";
import React, { useEffect, useRef, useState } from "react";

type Props = {
  children: React.ReactNode;
  tradingAccountAddress: string;
  defaultAccount: "funding" | "trading";
};

const TransferDialog = ({
  defaultAccount,
  tradingAccountAddress,
  children,
}: Props) => {
  const { subAccounts } = useSubaccount();

  const [fromAccountValue, setFromAccountValue] =
    useState<string>(defaultAccount);
  const [toAccountValue, setToAccountValue] = useState<string>(
    defaultAccount === "funding" ? "trading" : "funding"
  );

  const [selectedTradingAccountFrom, setSelectedTradingAccountFrom] = useState(
    tradingAccountAddress
  );

  const [selectedTradingAccountTo, setSelectedTradingAccountTo] = useState("");

  const [depositDenom, setDepositDenom] = useState<string>("BTC");
  const depositRef = useRef<HTMLInputElement>(null);

  function submitTransfer(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
  }

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="left-auto right-0 min-h-screen max-w-2xl translate-x-0 rounded-none border-r-0">
        <DialogTitle>Transfer</DialogTitle>
        <form onSubmit={submitTransfer} className="max-w-sm space-y-2">
          <div className="flex flex-row justify-between">
            <div className="space-y-2">
              <div className="space-y-1">
                <Text className="text-xs text-primary-accent" asChild>
                  <label htmlFor="dropdown-transfer-from">From</label>
                </Text>
                <Select
                  defaultValue={fromAccountValue}
                  value={fromAccountValue}
                  onValueChange={(newFromAccountValue) => {
                    if (
                      newFromAccountValue === "funding" &&
                      toAccountValue === "funding"
                    ) {
                      setToAccountValue("trading");
                    }

                    setFromAccountValue(newFromAccountValue);
                  }}
                >
                  <SelectTrigger
                    id="dropdown-transfer-from"
                    className="w-[180px]"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem
                      onClick={() => {
                        if (toAccountValue !== "funding") return;
                        setToAccountValue("trading");
                      }}
                      value="funding"
                    >
                      Funding
                    </SelectItem>

                    <SelectItem value="trading">Trading</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {fromAccountValue === "trading" && (
                <div className="space-y-1">
                  <Text className="text-xs text-primary-accent" asChild>
                    <label htmlFor="dropdown-trading-account-from">
                      Account from
                    </label>
                  </Text>

                  <Select
                    defaultValue={selectedTradingAccountFrom}
                    value={selectedTradingAccountFrom}
                    onValueChange={setSelectedTradingAccountFrom}
                  >
                    <SelectTrigger
                      id="dropdown-trading-account-from"
                      className="w-[180px]"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem
                        disabled={
                          selectedTradingAccountTo === tradingAccountAddress &&
                          toAccountValue === "trading"
                        }
                        value={tradingAccountAddress}
                      >
                        Trading account
                      </SelectItem>
                      {subAccounts.map((subAccount, index) => (
                        <SelectItem
                          disabled={
                            selectedTradingAccountTo === subAccount.address
                          }
                          value={subAccount.address}
                          key={subAccount.address}
                        >
                          {`Subaccount ${index + 1}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="space-y-1">
                <Text className="text-xs text-primary-accent" asChild>
                  <label htmlFor="dropdown-transfer-to">To</label>
                </Text>
                <Select
                  defaultValue={toAccountValue}
                  value={toAccountValue}
                  onValueChange={(newToAccountValue) => {
                    if (
                      newToAccountValue === "funding" &&
                      fromAccountValue === "funding"
                    ) {
                      setFromAccountValue("trading");
                    }

                    setToAccountValue(newToAccountValue);
                  }}
                >
                  <SelectTrigger
                    id="dropdown-transfer-to"
                    className="w-[180px]"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="funding">Funding</SelectItem>

                    <SelectItem value="trading">Trading</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {toAccountValue === "trading" && (
                <div className="space-y-1">
                  <Text className="text-xs text-primary-accent" asChild>
                    <label htmlFor="dropdown-trading-account-to">
                      Account to
                    </label>
                  </Text>
                  <Select
                    defaultValue={selectedTradingAccountTo}
                    value={selectedTradingAccountTo}
                    onValueChange={setSelectedTradingAccountTo}
                  >
                    <SelectTrigger
                      id="dropdown-trading-account-to"
                      className="w-[180px]"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem
                        disabled={
                          selectedTradingAccountFrom ===
                            tradingAccountAddress &&
                          fromAccountValue === "trading"
                        }
                        value={tradingAccountAddress}
                      >
                        Trading account
                      </SelectItem>

                      {subAccounts.map((subAccount, index) => (
                        <SelectItem
                          disabled={
                            selectedTradingAccountFrom === subAccount.address
                          }
                          value={subAccount.address}
                          key={subAccount.address}
                        >
                          {`Subaccount ${index + 1}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <Text className="text-xs text-primary-accent" asChild>
              <label htmlFor="input-btc-amount">Amount</label>
            </Text>
            {/* todo: refactor into seperate btc amount input */}
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

          <div className="pt-2">
            <Button className="" size="small">
              Transfer
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default TransferDialog;
