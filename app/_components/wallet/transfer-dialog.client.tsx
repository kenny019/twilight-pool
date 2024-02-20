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
  createInputCoinFromOutput,
  createTradingTxSingle,
  utxoStringToHex,
} from "@/lib/twilight/zkos";
import { useWallet } from "@cosmos-kit/react-lite";
import Big from "big.js";
import React, { useRef, useState } from "react";
import { GasPrice, calculateFee } from "@cosmjs/stargate";
import Resource from "@/components/resource";
import { Loader2 } from "lucide-react";
import { ZkAccount } from "@/lib/types";
import { ZK_ACCOUNT_INDEX } from "@/lib/constants";
import { createFundingToTradingTransferMsg } from "@/lib/twilight/wallet";
import { createZkAccountWithBalance } from "@/lib/twilight/zk";
import {
  broadcastTradingTx,
  queryUtxoForAddress,
  queryUtxoForOutput,
} from "@/lib/api/zkos";
import { useToast } from "@/lib/hooks/useToast";
import { useTwilightStore } from "@/lib/providers/store";
import Link from "next/link";

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

  const { toast } = useToast();

  const { mainWallet } = useWallet();

  const zkAccounts = useTwilightStore((state) => state.zk.zkAccounts);

  const updateZkAccount = useTwilightStore((state) => state.zk.updateZkAccount);

  const selectedZkAccountIndex = useTwilightStore(
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
    switch (fromAccountValue) {
      case "funding": {
        const chainWallet = mainWallet?.getChainWallet("nyks");

        if (!chainWallet) return;

        const twilightAddress = chainWallet.address;

        if (!twilightAddress) return;
      }
      default: {
      }
    }
  }

  async function submitTransfer(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!depositRef.current?.value) return; // todo: validation

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

    setIsSubmitLoading(true);

    const transferAmount = new BTC(
      depositDenom as BTCDenoms,
      Big(depositRef.current.value)
    )
      .convert("sats")
      .toNumber();

    try {
      // todo: cleanup into seperate function
      if (fromAccountValue === "funding") {
        const depositZkAccount = zkAccounts.filter(
          (account) => account.address === selectedTradingAccountTo
        )[0];
        console.log("depositZkAccount", depositZkAccount.tag);

        if (!depositZkAccount) {
          console.error("error cant find depositZkAccount", depositZkAccount);
          toast({
            variant: "error",
            title: "An error has occurred",
            description: "Please try again later.",
          });
          return;
        }

        const stargateClient = await chainWallet.getSigningStargateClient();

        const { account: newTradingAccount, accountHex: newTradingAccountHex } =
          await createZkAccountWithBalance({
            tag: depositZkAccount.tag,
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
          100
        );

        console.log("sent sats from funding to trading", transferAmount);
        console.log("res", res);

        setIsSubmitLoading(false);

        console.log("updated zkaccount data", {
          tag: newTradingAccount.tag,
          address: newTradingAccount.address,
          scalar: newTradingAccount.scalar,
          isOnChain: true,
          value: transferAmount,
        });

        updateZkAccount(selectedZkAccount.address, {
          tag: newTradingAccount.tag,
          address: newTradingAccount.address,
          scalar: newTradingAccount.scalar,
          isOnChain: true,
          value: transferAmount,
        });

        toast({
          title: "Success",
          description: (
            <div className="flex space-x-1 opacity-90">
              {`Successfully sent ${new BTC("sats", Big(transferAmount))
                .convert("BTC")
                .toString()} BTC to ${depositZkAccount.tag}. `}
              <Button
                variant="link"
                className="inline-flex text-sm opacity-90 hover:opacity-100"
                asChild
              >
                <Link
                  href={`https://nyks.twilight-explorer.com/transaction/${res.transactionHash}`}
                  target={"_blank"}
                >
                  Explorer link
                </Link>
              </Button>
            </div>
          ),
        });
      } else {
        const senderZkAccount = zkAccounts.filter(
          (account) => account.address === selectedTradingAccountFrom
        )[0];

        const depositZkAccount = zkAccounts.filter(
          (account) => account.address === selectedTradingAccountTo
        )[0];

        if (!senderZkAccount || !Object.hasOwn(senderZkAccount, "value")) {
          console.error("error cant find depositZkAccount", depositZkAccount);
          return;
        }

        const utxoData = await queryUtxoForAddress(senderZkAccount.address);

        if (!Object.hasOwn(utxoData, "output_index")) {
          setIsSubmitLoading(false);
          console.error("no utxoData");
          return;
        }

        const utxoString = JSON.stringify(utxoData);

        const utxoHex = await utxoStringToHex({
          utxoString,
        });

        const output = await queryUtxoForOutput(utxoHex);

        if (!Object.hasOwn(output, "out_type")) {
          setIsSubmitLoading(false);
          console.error("no Output");
          return;
        }

        const outputString = JSON.stringify(output);

        const inputString = await createInputCoinFromOutput({
          outputString,
          utxoString,
        });

        console.log("receiverAddress", depositZkAccount.address);

        const msgStruct = await createTradingTxSingle({
          signature: quisPrivateKey,
          senderInput: inputString,
          receiverAddress: depositZkAccount.address,
          amount: transferAmount,
          updatedSenderBalance:
            (senderZkAccount.value as number) - transferAmount,
        });

        const { encrypt_scalar_hex, tx } = JSON.parse(msgStruct) as {
          tx: string;
          encrypt_scalar_hex: string;
        };

        const txId = await broadcastTradingTx(tx);
        console.log("broadcasted", txId);

        updateZkAccount(depositZkAccount.address, {
          ...depositZkAccount,
          scalar: encrypt_scalar_hex,
          value: transferAmount,
          isOnChain: true,
        });

        toast({
          title: "Success",
          description: `Successfully sent ${new BTC("sats", Big(transferAmount))
            .convert("BTC")
            .toString()} BTC to ${depositZkAccount.tag}`,
        });
        setIsSubmitLoading(false);
      }
    } catch (err) {
      console.error("err", err);
      setIsSubmitLoading(false);
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
                            {subAccount.tag}
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
                            {subAccount.tag}
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
