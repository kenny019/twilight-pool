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
import { useTwilight } from "@/lib/providers/twilight";
import BTC, { BTCDenoms } from "@/lib/twilight/denoms";
import {
  generatePublicKey,
  generateRandomScalar,
  generateTradingAccount,
  getTradingAddressFromTradingAccount,
} from "@/lib/twilight/zkos";
import { useWallet } from "@cosmos-kit/react-lite";
import Big from "big.js";
import React, { useRef, useState } from "react";
import { twilightproject } from "twilightjs";

import Long from "long";
import { GasPrice, calculateFee } from "@cosmjs/stargate";
import Resource from "@/components/resource";
import { Loader2 } from "lucide-react";
import { ZkAccount } from "@/lib/types";
import { useAccountStore } from "@/lib/state/store";
import { ZK_ACCOUNT_INDEX } from "@/lib/constants";
import { createFundingToTradingTransferMsg } from "@/lib/twilight/wallet";
import { createZkAccountWithBalance } from "@/lib/twilight/zk";

type Props = {
  children: React.ReactNode;
  tradingAccountAddress?: string;
  defaultAccount: "funding" | "trading";
};

const TransferDialog = ({
  defaultAccount,
  tradingAccountAddress,
  children,
}: Props) => {
  const { quisPrivateKey } = useTwilight();

  const { mainWallet } = useWallet();

  const zkAccounts = useAccountStore((state) => state.zk.zkAccounts);

  const updateZkAccount = useAccountStore.getState().zk.updateZkAccount;

  const selectedZkAccountIndex = useAccountStore(
    (state) => state.zk.selectedZkAccount
  );

  const selectedZkAccount = zkAccounts[selectedZkAccountIndex];

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

  const [isSubmitLoading, setIsSubmitLoading] = useState(false);

  async function updateTransferredAccount(newAccountData: ZkAccount) {
    switch (toAccountValue) {
      case "trading": {
        const chainWallet = mainWallet?.getChainWallet("nyks");

        if (!chainWallet) return;

        const twilightAddress = chainWallet.address;

        if (!twilightAddress) return;

        // if (selectedTradingAccountFrom !== tradingAccountAddress) return;

        // const utxoData = await queryUtxoForAddress(newAccountData.address);

        // if (!utxoData.output_index) return;

        // const utxoString = JSON.stringify(utxoData);

        // console.log("utxoString", utxoString);

        // const utxoHex = await utxoStringToHex({ utxoString });

        // const output = await queryUtxoForOutput(utxoHex);

        // if (!output.out_type) return;
      }
      default: {
      }
    }
  }

  async function submitTransfer(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!depositRef.current?.value) return; // todo: validation

    // todo: cleanup into seperate function
    if (fromAccountValue === "funding") {
      const chainWallet = mainWallet?.getChainWallet("nyks");

      if (!chainWallet) {
        console.error("no chainWallet");
        return;
      }

      const twilightAddress = chainWallet.address;
      if (!twilightAddress) {
        console.error("no twilightAddress");
        return;
      }

      try {
        setIsSubmitLoading(true);
        const transferAmount = new BTC(
          depositDenom as BTCDenoms,
          Big(depositRef.current.value)
        )
          .convert("sats")
          .toNumber();

        const stargateClient = await chainWallet.getSigningStargateClient();

        const { account: newTradingAccount, accountHex: newTradingAccountHex } =
          await createZkAccountWithBalance({
            tag: selectedZkAccount.tag,
            balance: transferAmount,
            signature: quisPrivateKey,
          });

        const msg = await createFundingToTradingTransferMsg({
          twilightAddress,
          signature: quisPrivateKey,
          transferAmount,
          account: newTradingAccount,
          accountHex: newTradingAccountHex,
        });

        console.log("msg", msg);

        const gasPrice = GasPrice.fromString("1nyks");
        const gasEstimation = await stargateClient.simulate(
          twilightAddress,
          [msg],
          ""
        );

        const fee = calculateFee(Math.round(gasEstimation * 1.3), gasPrice);

        const res = await stargateClient.signAndBroadcast(
          twilightAddress,
          [msg],
          fee
        );

        console.log("sent sats from funding to trading", transferAmount);
        console.log("res", res);

        setIsSubmitLoading(false);

        console.log("updated zkaccount data", {
          tag: selectedZkAccount.tag,
          address: newTradingAccount.address,
          scalar: newTradingAccount.scalar,
          isOnChain: true,
          value: (selectedZkAccount.value || 0) + transferAmount,
        });

        updateZkAccount(selectedZkAccount.address, {
          tag: selectedZkAccount.tag,
          address: newTradingAccount.address,
          scalar: newTradingAccount.scalar,
          isOnChain: true,
          value: (selectedZkAccount.value || 0) + transferAmount,
        });
      } catch (err) {
        console.error(err);

        setIsSubmitLoading(false);
      }
    } else {
    }
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
                        value={tradingAccountAddress || ""}
                      >
                        Trading account
                      </SelectItem>
                      {zkAccounts.map((subAccount, index) => {
                        if (index === ZK_ACCOUNT_INDEX.MAIN) {
                          return null;
                        }
                        return (
                          <SelectItem
                            disabled={
                              selectedTradingAccountTo === subAccount.address
                            }
                            value={subAccount.address}
                            key={subAccount.address}
                          >
                            {`Subaccount ${index}`}
                          </SelectItem>
                        );
                      })}
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
                        value={tradingAccountAddress || ""}
                      >
                        Trading account
                      </SelectItem>

                      {zkAccounts.map((subAccount, index) => {
                        if (index === ZK_ACCOUNT_INDEX.MAIN) return null;
                        return (
                          <SelectItem
                            disabled={
                              selectedTradingAccountFrom === subAccount.address
                            }
                            value={subAccount.address}
                            key={subAccount.address}
                          >
                            {`Subaccount ${index}`}
                          </SelectItem>
                        );
                      })}
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
            <Button disabled={isSubmitLoading} type="submit" size="small">
              <Resource
                isLoaded={!isSubmitLoading}
                placeholder={<Loader2 className="animate-spin" />}
              >
                Transfer
              </Resource>
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default TransferDialog;
