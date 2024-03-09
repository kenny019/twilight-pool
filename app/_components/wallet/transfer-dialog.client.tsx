import Button from "@/components/button";
import Long from "long";
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
import BTC, { BTCDenoms } from "@/lib/twilight/denoms";
import {
  createInputCoinFromOutput,
  createTradingTxSingle,
  utxoStringToHex,
} from "@/lib/twilight/zkos";
import { useWallet } from "@cosmos-kit/react-lite";
import Big from "big.js";
import React, { useEffect, useRef, useState } from "react";
import { GasPrice, calculateFee } from "@cosmjs/stargate";
import Resource from "@/components/resource";
import { Loader2 } from "lucide-react";
import { ZkAccount } from "@/lib/types";
import { createFundingToTradingTransferMsg } from "@/lib/twilight/wallet";
import { createZkAccountWithBalance, createZkBurnTx } from "@/lib/twilight/zk";
import {
  broadcastTradingTx,
  queryUtxoForAddress,
  queryUtxoForOutput,
} from "@/lib/api/zkos";
import { useToast } from "@/lib/hooks/useToast";
import { useTwilightStore } from "@/lib/providers/store";
import Link from "next/link";
import { useSessionStore } from "@/lib/providers/session";
import useGetTwilightBTCBalance from "@/lib/hooks/useGetTwilightBtcBalance";
import { twilightproject } from "twilightjs";
import { ZkPrivateAccount } from "@/lib/zk/account";

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
  const { toast } = useToast();

  const { mainWallet } = useWallet();

  const zkAccounts = useTwilightStore((state) => state.zk.zkAccounts);

  const updateZkAccount = useTwilightStore((state) => state.zk.updateZkAccount);
  const removeZkAccount = useTwilightStore((state) => state.zk.removeZkAccount);

  const addTransactionHistory = useTwilightStore(
    (state) => state.history.addTransaction
  );

  const privateKey = useSessionStore((state) => state.privateKey);

  const { twilightSats } = useGetTwilightBTCBalance();

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

  useEffect(() => {
    if (
      toAccountValue === "funding" &&
      fromAccountValue === "trading" &&
      selectedTradingAccountFrom
    ) {
      const selectedTradingAccount = zkAccounts.find(
        (account) => account.address === selectedTradingAccountFrom
      );

      if (
        !selectedTradingAccount ||
        !selectedTradingAccount.value ||
        !depositRef.current
      )
        return;

      depositRef.current.value = new BTC(
        "sats",
        Big(selectedTradingAccount.value)
      )
        .convert(depositDenom as BTCDenoms)
        .toString();
    }
  }, [toAccountValue, fromAccountValue, selectedTradingAccountFrom]);

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
            signature: privateKey,
          });

        const msg = await createFundingToTradingTransferMsg({
          twilightAddress,
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

        updateZkAccount(selectedTradingAccountTo, {
          tag: newTradingAccount.tag,
          address: newTradingAccount.address,
          scalar: newTradingAccount.scalar,
          isOnChain: true,
          value: transferAmount,
        });

        addTransactionHistory({
          date: new Date(),
          from: twilightAddress,
          fromTag: "Funding",
          to: newTradingAccount.address,
          toTag: newTradingAccount.tag,
          tx_hash: res.transactionHash,
          type: "Transfer",
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

        if (toAccountValue === "trading") {
          const depositZkAccount = zkAccounts.find(
            (account) => account.address === selectedTradingAccountTo
          );

          if (!depositZkAccount) {
            toast({
              variant: "error",
              title: "An error has occurred",
              description: "Unable to transfer to invalid address",
            });
            return;
          }

          const senderZkPrivateAccount = await ZkPrivateAccount.create({
            signature: privateKey,
            existingAccount: senderZkAccount,
          });
          const privateTxSingleResult =
            await senderZkPrivateAccount.privateTxSingle(
              transferAmount,
              depositZkAccount.address
            );

          if (!privateTxSingleResult.success) {
            console.error(privateTxSingleResult.message);
            toast({
              variant: "error",
              title: "An error has occurred",
              description: privateTxSingleResult.message,
            });
            return;
          }

          const {
            scalar: depositAccountScalar,
            txId,
            updatedAddress,
          } = privateTxSingleResult.data;

          console.log("txId", txId, "updatedAddess", updatedAddress);
          const updatedSenderAccount = senderZkPrivateAccount.get();

          const depositZkPrivateAccount = await ZkPrivateAccount.create({
            signature: privateKey,
            existingAccount: depositZkAccount,
          });

          const depositAccountBalanceResult =
            await depositZkPrivateAccount.getAccountBalance();

          if (!depositAccountBalanceResult.success) {
            console.error(depositAccountBalanceResult.message);
            toast({
              variant: "error",
              title: "An error has occurred",
              description: depositAccountBalanceResult.message,
            });
            return;
          }

          const depositAccountBalance = depositAccountBalanceResult.data;

          updateZkAccount(senderZkAccount.address, {
            ...senderZkAccount,
            value: updatedSenderAccount.value,
            isOnChain: updatedSenderAccount.isOnChain,
          });

          updateZkAccount(depositZkAccount.address, {
            ...depositZkAccount,
            scalar: depositAccountScalar,
            value: depositAccountBalance,
            isOnChain: true,
          });

          toast({
            title: "Success",
            description: `Successfully sent ${new BTC(
              "sats",
              Big(transferAmount)
            )
              .convert("BTC")
              .toString()} BTC to ${depositZkAccount.tag}`,
          });
        } else {
          if (!senderZkAccount.value) {
            toast({
              variant: "error",
              title: "An error has occurred",
              description: "Account does not have enough value to send",
            });
            setIsSubmitLoading(false);
            return;
          }

          const {
            success,
            msg: zkBurnMsg,
            zkAccountHex,
          } = await createZkBurnTx({
            signature: privateKey,
            zkAccount: senderZkAccount,
          });

          if (!success || !zkBurnMsg || !zkAccountHex) {
            toast({
              variant: "error",
              title: "An error has occurred",
              description: "Please try again later.",
            });
            console.error("error creating zkBurnTx msg");
            setIsSubmitLoading(false);
            return;
          }

          toast({
            title: "Broadcasting transfer",
            description:
              "Please wait while your transfer is being submitted...",
          });

          const tradingTxResString = await broadcastTradingTx(
            zkBurnMsg,
            twilightAddress
          );

          const tradingTxRes = JSON.parse(tradingTxResString as string);

          if (Object.hasOwn(tradingTxRes, "error")) {
            toast({
              variant: "error",
              title: "An error has occurred",
              description: "Please try again later.",
            });
            console.error("error broadcasting zkBurnTx msg", tradingTxRes);
            setIsSubmitLoading(false);
            return;
          }

          console.log("tradingTxRes", tradingTxRes);

          const { mintBurnTradingBtc } =
            twilightproject.nyks.zkos.MessageComposer.withTypeUrl;

          const stargateClient = await chainWallet.getSigningStargateClient();
          const mintBurnMsg = mintBurnTradingBtc({
            btcValue: Long.fromNumber(senderZkAccount.value as number),
            encryptScalar: senderZkAccount.scalar,
            mintOrBurn: false,
            qqAccount: zkAccountHex,
            twilightAddress,
          });

          console.log("mintBurnMsg", mintBurnMsg);
          const mintBurnRes = await stargateClient.signAndBroadcast(
            twilightAddress,
            [mintBurnMsg],
            100
          );

          updateZkAccount(senderZkAccount.address, {
            ...senderZkAccount,
            isOnChain: false,
            value: 0,
          });

          addTransactionHistory({
            date: new Date(),
            from: senderZkAccount.address,
            fromTag: senderZkAccount.tag,
            to: twilightAddress,
            toTag: "Funding",
            tx_hash: mintBurnRes.transactionHash,
            type: "Burn",
            value: transferAmount,
          });

          console.log(
            "sent sats from trading to funding",
            senderZkAccount.value
          );

          console.log("mintBurnRes", mintBurnRes);
          toast({
            title: "Success",
            description: (
              <div className="flex space-x-1 opacity-90">
                {`Successfully sent ${new BTC("sats", Big(transferAmount))
                  .convert("BTC")
                  .toString()} BTC to Funding Account. `}
                <Button
                  variant="link"
                  className="inline-flex text-sm opacity-90 hover:opacity-100"
                  asChild
                >
                  <Link
                    href={`https://nyks.twilight-explorer.com/transaction/${mintBurnRes.transactionHash}`}
                    target={"_blank"}
                  >
                    Explorer link
                  </Link>
                </Button>
              </div>
            ),
          });
        }

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

                {fromAccountValue === "funding" && (
                  <Text className="text-xs text-primary/80">
                    {new BTC("sats", Big(twilightSats || 0))
                      .convert(depositDenom as BTCDenoms)
                      .toString()}
                    {` ${depositDenom}`}
                  </Text>
                )}
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
                    onValueChange={(newAddress) => {
                      setSelectedTradingAccountFrom(newAddress);
                    }}
                  >
                    <SelectTrigger
                      id="dropdown-trading-account-from"
                      className="w-[180px]"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {zkAccounts.map((subAccount) => {
                        return (
                          <SelectItem
                            disabled={
                              selectedTradingAccountTo === subAccount.address &&
                              toAccountValue === "trading"
                            }
                            value={subAccount.address}
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

                  {zkAccounts.find(
                    (account) => account.address === selectedTradingAccountFrom
                  )?.value ? (
                    <Text className="text-xs text-primary/80">
                      {new BTC(
                        "sats",
                        Big(
                          zkAccounts.find(
                            (account) =>
                              account.address === selectedTradingAccountFrom
                          )?.value || 0
                        )
                      )
                        .convert(depositDenom as BTCDenoms)
                        .toString()}
                      {` ${depositDenom}`}
                    </Text>
                  ) : (
                    <Text className="text-xs text-primary/80">{`0 ${depositDenom}`}</Text>
                  )}
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

                    // if (
                    //   newToAccountValue === "funding" &&
                    //   fromAccountValue === "trading" &&
                    //   selectedTradingAccountFrom
                    // ) {
                    //   const selectedTradingAccount = zkAccounts.find(
                    //     (account) =>
                    //       account.address === selectedTradingAccountFrom
                    //   );

                    //   if (
                    //     !selectedTradingAccount ||
                    //     !selectedTradingAccount.value ||
                    //     !depositRef.current
                    //   )
                    //     return;

                    //   depositRef.current.value = new BTC(
                    //     "sats",
                    //     Big(selectedTradingAccount.value)
                    //   )
                    //     .convert(depositDenom as BTCDenoms)
                    //     .toString();
                    // }
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

                {toAccountValue === "funding" && (
                  <Text className="text-xs text-primary/80">
                    {new BTC("sats", Big(twilightSats || 0))
                      .convert("BTC")
                      .toFixed(8)}{" "}
                    BTC
                  </Text>
                )}
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
                      {zkAccounts.map((subAccount) => {
                        return (
                          <SelectItem
                            disabled={
                              selectedTradingAccountFrom ===
                                subAccount.address &&
                              fromAccountValue === "trading"
                            }
                            value={subAccount.address}
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

                  {zkAccounts.find(
                    (account) => account.address === selectedTradingAccountTo
                  )?.value ? (
                    <Text className="text-xs text-primary/80">
                      {new BTC(
                        "sats",
                        Big(
                          zkAccounts.find(
                            (account) =>
                              account.address === selectedTradingAccountTo
                          )?.value || 0
                        )
                      )
                        .convert(depositDenom as BTCDenoms)
                        .toString()}
                      {` ${depositDenom}`}
                    </Text>
                  ) : (
                    <Text className="text-xs text-primary/80">{`0 ${depositDenom}`}</Text>
                  )}
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
              readOnly={toAccountValue === "funding"}
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
