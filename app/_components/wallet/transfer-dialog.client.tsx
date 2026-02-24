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
import { verifyAccount, verifyQuisQuisTransaction } from "@/lib/twilight/zkos";
import { useWallet } from "@cosmos-kit/react-lite";
import Big from "big.js";
import React, { useEffect, useRef, useState } from "react";
import { GasPrice, calculateFee } from "@cosmjs/stargate";
import Resource from "@/components/resource";
import { Loader2 } from "lucide-react";
import { createFundingToTradingTransferMsg } from "@/lib/twilight/wallet";
import {
  createZkAccount,
  createZkAccountWithBalance,
  createZkBurnTx,
} from "@/lib/twilight/zk";
import { broadcastTradingTx, queryUtxoForAddress } from "@/lib/api/zkos";
import { useToast } from "@/lib/hooks/useToast";
import { useTwilightStore } from "@/lib/providers/store";
import Link from "next/link";
import { useSessionStore } from "@/lib/providers/session";
import useGetTwilightBTCBalance from "@/lib/hooks/useGetTwilightBtcBalance";
import { twilightproject } from "twilightjs";
import { ZkPrivateAccount } from "@/lib/zk/account";
import { safeJSONParse, isUserRejection } from "@/lib/helpers";
import { masterAccountQueue } from "@/lib/utils/masterAccountQueue";
import {
  hasUtxoData,
  serializeTxid,
  waitForUtxoUpdate,
} from "@/lib/utils/waitForUtxoUpdate";
import { useTwilightStoreApi } from "@/lib/providers/store";
import { getRegisteredBTCAddress } from '@/lib/twilight/rest';
import { registerBTCAddress } from '@/lib/utils/btc-registration';
import dayjs from "dayjs";

const renameTag = (tag: string) => tag === "main" ? "Trading Account" : tag;

type Props = {
  children: React.ReactNode;
  tradingAccountAddress?: string;
  defaultAccount: "funding" | "trading";
};

async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const TransferDialog = ({
  defaultAccount,
  tradingAccountAddress,
  children,
}: Props) => {
  const { toast } = useToast();

  const { mainWallet } = useWallet();

  const zkAccountsRaw = useTwilightStore((state) => state.zk.zkAccounts);

  const zkAccounts = zkAccountsRaw.filter((account) => account.type !== "Memo");

  const updateZkAccount = useTwilightStore((state) => state.zk.updateZkAccount);
  const addZkAccount = useTwilightStore((state) => state.zk.addZkAccount);

  const addTransactionHistory = useTwilightStore(
    (state) => state.history.addTransaction
  );

  const privateKey = useSessionStore((state) => state.privateKey);
  const storeApi = useTwilightStoreApi();

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
  const [depositAmount, setDepositAmount] = useState<string>("");

  const [isSubmitLoading, setIsSubmitLoading] = useState(false);

  useEffect(() => {
    if (
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

      const amountString = new BTC(
        "sats",
        Big(selectedTradingAccount.value)
      )
        .convert(depositDenom as BTCDenoms)
        .toString();

      depositRef.current.value = amountString;
      setDepositAmount(amountString);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toAccountValue, fromAccountValue, selectedTradingAccountFrom, depositDenom]);

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

    if (transferAmount < 1) {
      toast({
        title: "Unable to transfer",
        description: "Transfer amount must be greater than 0",
      });
      return;
    }

    try {
      const registeredBtcAddress = await getRegisteredBTCAddress(twilightAddress);

      if (!registeredBtcAddress) {
        const result = await registerBTCAddress(chainWallet);

        if (!result.success) {
          toast({
            title: "Unable to register BTC address",
            description: result.error || "Failed to register BTC address",
          });
          setIsSubmitLoading(false);
          return;
        }
      }

      // todo: cleanup into seperate function
      if (fromAccountValue === "funding") {
        const depositZkAccount = zkAccounts.filter(
          (account) => account.address === selectedTradingAccountTo
        )[0];

        if (!depositZkAccount) {
          console.error("error cant find depositZkAccount", depositZkAccount);
          toast({
            variant: "error",
            title: "Please select a valid account",
            description: "Please select a valid account to transfer to",
          });
          setIsSubmitLoading(false);
          return;
        }

        // if (depositZkAccount.value && depositZkAccount.value > 0) {
        //   toast({
        //     title: "Unable to transfer",
        //     description: "Unable to transfer to an account with balance",
        //   });
        //   setIsSubmitLoading(false);
        //   return;
        // }

        if (twilightSats < transferAmount) {
          toast({
            title: "Unable to transfer",
            description: "Insufficient balance",
          });
          setIsSubmitLoading(false);
          return;
        }

        const stargateClient = await chainWallet.getSigningStargateClient();

        console.log("funding transfer signature", privateKey);
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
          "auto"
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
          type: "Coin",
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
            <div className="opacity-90">
              {`Successfully sent ${new BTC("sats", Big(transferAmount))
                .convert("BTC")
                .toString()} BTC to ${renameTag(depositZkAccount.tag)}. `}
              <Link
                href={`${process.env.NEXT_PUBLIC_EXPLORER_URL as string}/txs/${res.transactionHash}`}
                target={"_blank"}
                className="text-sm underline hover:opacity-100"
              >
                Explorer link
              </Link>
            </div>
          ),
        });
      } else {
        const senderZkAccount = zkAccounts.filter(
          (account) => account.address === selectedTradingAccountFrom
        )[0];

        if (!senderZkAccount) {
          toast({
            variant: "error",
            title: "Please select a valid account",
            description: "Please select a valid account to transfer from",
          });
          setIsSubmitLoading(false);
          return;
        }

        if (!senderZkAccount.value) {
          toast({
            variant: "error",
            title: "An error has occurred",
            description: "Account does not have enough balance to send",
          });
          setIsSubmitLoading(false);
          return;
        }

        if (toAccountValue === "trading") {
          const depositZkAccount = zkAccounts.find(
            (account) => account.address === selectedTradingAccountTo
          );

          if (!depositZkAccount) {
            toast({
              variant: "error",
              title: "Please select a valid account",
              description: "Please select a valid account to transfer to",
            });
            setIsSubmitLoading(false);
            return;
          }

          // if (depositZkAccount.value && depositZkAccount.value > 0) {
          //   toast({
          //     title: "Unable to transfer",
          //     description: "Unable to transfer to an account with balance",
          //   });
          //   setIsSubmitLoading(false);
          //   return;
          // }

          if (depositZkAccount.type === "Memo" || senderZkAccount.type === "Memo") {
            toast({
              title: "Unable to transfer",
              description: depositZkAccount.type === "Memo" ? "Unable to transfer to a memo account" : "Unable to transfer from a memo account",
            });
            setIsSubmitLoading(false);
            return;
          }

          console.log("ZkPrivateAccount.create");
          const senderZkPrivateAccount = await ZkPrivateAccount.create({
            signature: privateKey,
            existingAccount: senderZkAccount,
          });

          // if (senderZkPrivateAccount.get().value - transferAmount !== 0) {
          //   console.log("senderZkPrivateAccount.get().value", senderZkPrivateAccount.get());
          //   toast({
          //     variant: "error",
          //     title: "An error has occurred",
          //     description:
          //       "You must transfer the full amount in the sender account.",
          //   });
          //   setIsSubmitLoading(false);
          //   return;
          // }


          console.log("senderZkPrivateAccount.privateTxSingle");
          const privateTxSingleResult =
            await senderZkPrivateAccount.privateTxSingle(
              transferAmount,
              depositZkAccount.address,
              depositZkAccount.value,
            );

          if (!privateTxSingleResult.success) {
            console.error(privateTxSingleResult.message);
            toast({
              variant: "error",
              title: "An error has occurred",
              description: privateTxSingleResult.message,
            });
            setIsSubmitLoading(false);
            return;
          }

          const {
            scalar: updatedDepositScalar,
            txId,
            updatedAddress: updatedDepositAddress,
          } = privateTxSingleResult.data;

          console.log("txId", txId, "updatedAddess", updatedDepositAddress);

          const updatedSenderAccount = senderZkPrivateAccount.get();

          const updatedZkAccount = {
            ...depositZkAccount,
            address: updatedDepositAddress,
            scalar: updatedDepositScalar,
          };

          const depositZkPrivateAccount = await ZkPrivateAccount.create({
            signature: privateKey,
            existingAccount: updatedZkAccount,
          });

          // const depositAccountBalanceResult =
          //   await depositZkPrivateAccount.getAccountBalance();

          // if (!depositAccountBalanceResult.success) {
          //   console.error(depositAccountBalanceResult.message);
          //   toast({
          //     variant: "error",
          //     title: "An error has occurred",
          //     description: depositAccountBalanceResult.message,
          //   });
          //   setIsSubmitLoading(false);
          //   return;
          // }

          // const depositAccountBalance = depositAccountBalanceResult.data;

          console.log(
            "test >>",
            depositZkPrivateAccount.get(),
            // depositAccountBalance
          );

          addTransactionHistory({
            date: new Date(),
            from: senderZkAccount.address,
            fromTag: senderZkAccount.tag,
            to: updatedDepositAddress,
            toTag: depositZkAccount.tag,
            tx_hash: txId,
            type: "Transfer",
            value: transferAmount,
          });

          updateZkAccount(senderZkAccount.address, {
            ...senderZkAccount,
            address: updatedSenderAccount.address,
            scalar: updatedSenderAccount.scalar,
            value: updatedSenderAccount.value,
            isOnChain: updatedSenderAccount.isOnChain,
          });

          const rawDepositZkAccountData = depositZkPrivateAccount.get();
          console.log("rawDepositZkAccountData", rawDepositZkAccountData);

          updateZkAccount(depositZkAccount.address, {
            ...depositZkAccount,
            address: rawDepositZkAccountData.address,
            scalar: rawDepositZkAccountData.scalar,
            value: Big(transferAmount).add(depositZkAccount.value || 0).toNumber(),
            isOnChain: true,
          });

          toast({
            title: "Success",
            description: `Successfully sent ${new BTC(
              "sats",
              Big(transferAmount)
            )
              .convert("BTC")
              .toString()} BTC to ${renameTag(depositZkAccount.tag)}`,
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

          if (senderZkAccount.type === "Memo") {
            toast({
              title: "Unable to transfer",
              description: "Unable to transfer from a memo account",
            });
            setIsSubmitLoading(false);
            return;
          }

          const runBurn = async () => {
            const currentSender = storeApi.getState().zk.zkAccounts.find(
              (a) => a.address === senderZkAccount.address
            );
            if (!currentSender) return;

            const transientZkAccount = await createZkAccount({
              tag: "transient",
              signature: privateKey,
            });

            const utxoBefore =
              senderZkAccount.tag === "main"
                ? await queryUtxoForAddress(currentSender.address)
                : null;
            const previousTxid =
              utxoBefore && hasUtxoData(utxoBefore)
                ? serializeTxid(utxoBefore.txid)
                : "";

            const senderZkPrivateAccount = await ZkPrivateAccount.create({
              signature: privateKey,
              existingAccount: currentSender,
            });

            const privateTxSingleResult =
              await senderZkPrivateAccount.privateTxSingle(
                transferAmount,
                transientZkAccount.address
              );

            if (!privateTxSingleResult.success) {
              console.error(privateTxSingleResult.message);
              toast({
                variant: "error",
                title: "An error has occurred",
                description: privateTxSingleResult.message,
              });
              setIsSubmitLoading(false);
              return;
            }

            if (senderZkAccount.tag === "main") {
              const utxoWait = await waitForUtxoUpdate(
                senderZkPrivateAccount.get().address,
                previousTxid
              );
              if (!utxoWait.success) {
                console.warn(
                  "transfer-dialog waitForUtxoUpdate timed out:",
                  utxoWait.message
                );
              }
            }

            const {
              scalar: updatedTransientScalar,
              txId,
              updatedAddress: updatedTransientAddress,
            } = privateTxSingleResult.data;

            console.log("txId", txId, "updatedAddess", updatedTransientAddress);

            console.log(
              "transient zkAccount balance =",
              transferAmount,
            );

            const {
              success,
              msg: zkBurnMsg,
              zkAccountHex,
            } = await createZkBurnTx({
              signature: privateKey,
              zkAccount: {
                tag: senderZkAccount.tag,
                address: updatedTransientAddress,
                scalar: updatedTransientScalar,
                isOnChain: true,
                value: transferAmount,
                type: "Coin",
              },
              initZkAccountAddress: transientZkAccount.address,
            });

            if (!success || !zkBurnMsg || !zkAccountHex) {
              toast({
                variant: "error",
                title: "An error has occurred",
                description: "Please try again later.",
              });
              console.error("error creating zkBurnTx msg");
              console.error({
                success,
                zkBurnMsg,
                zkAccountHex,
              });
              setIsSubmitLoading(false);
              return;
            }

            console.log({
              zkAccountHex: zkAccountHex,
              balance: transferAmount,
              signature: privateKey,
              initZkAccountAddress: transientZkAccount.address,
            });

            const isAccountValid = await verifyAccount({
              zkAccountHex: zkAccountHex,
              balance: transferAmount,
              signature: privateKey,
            });

            console.log("isAccountValid", isAccountValid);

            toast({
              title: "Broadcasting transfer",
              description:
                "Please do not close this page while your transfer is being submitted...",
            });

            const txValidMessage = await verifyQuisQuisTransaction({
              tx: zkBurnMsg,
            });

            console.log("txValidMessage", txValidMessage);

            const tradingTxResString = await broadcastTradingTx(
              zkBurnMsg,
              twilightAddress
            );

            console.log("zkBurnMsg tradingTxResString >>"), tradingTxResString;

            const tradingTxRes = safeJSONParse(tradingTxResString as string);

            if (!tradingTxRes.success || Object.hasOwn(tradingTxRes, "error")) {
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

            console.log({
              btcValue: Long.fromNumber(transferAmount),
              encryptScalar: updatedTransientScalar,
              mintOrBurn: false,
              qqAccount: zkAccountHex,
              twilightAddress,
            });

            const mintBurnMsg = mintBurnTradingBtc({
              btcValue: Long.fromNumber(transferAmount),
              encryptScalar: updatedTransientScalar,
              mintOrBurn: false,
              qqAccount: zkAccountHex,
              twilightAddress,
            });

            console.log("mintBurnMsg", mintBurnMsg);
            const mintBurnRes = await stargateClient.signAndBroadcast(
              twilightAddress,
              [mintBurnMsg],
              "auto"
            );

            updateZkAccount(senderZkAccount.address, {
              ...senderZkAccount,
              address: senderZkPrivateAccount.get().address,
              scalar: senderZkPrivateAccount.get().scalar,
              value: senderZkPrivateAccount.get().value,
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
                <div className="opacity-90">
                  {`Successfully sent ${new BTC("sats", Big(transferAmount))
                    .convert("BTC")
                    .toString()} BTC to Funding Account. `}
                  <Link
                    href={`${process.env.NEXT_PUBLIC_EXPLORER_URL as string}/txs/${mintBurnRes.transactionHash}`}
                    target={"_blank"}
                    className="text-sm underline hover:opacity-100"
                  >
                    Explorer link
                  </Link>
                </div>
              ),
            });
          };

          if (senderZkAccount.tag === "main") {
            await masterAccountQueue.enqueue(runBurn);
          } else {
            await runBurn();
          }
        }

        setIsSubmitLoading(false);
      }
    } catch (err) {
      if (isUserRejection(err)) {
        toast({
          title: "Transaction rejected",
          description: "You declined the transaction in your wallet.",
        });
        setIsSubmitLoading(false);
        return;
      }
      toast({
        variant: "error",
        title: "An error has occurred",
        description: "An error has occurred, please check the console for more information",
      });
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
                    onValueChange={async (newAddress) => {
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
                      {zkAccounts.filter((account) => account.value || (account.type === "CoinSettled" && account.value)).map((subAccount) => {
                        return (
                          <SelectItem
                            disabled={
                              selectedTradingAccountTo === subAccount.address &&
                              toAccountValue === "trading"
                            }
                            value={subAccount.address}
                            key={subAccount.address}
                          >
                            {renameTag(subAccount.tag)}
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
                    onValueChange={async (newAddress) => {
                      if (newAddress === "create") {
                        const tag = `Subaccount ${zkAccountsRaw.length}`

                        const newZkAccount = await createZkAccount({
                          tag,
                          signature: privateKey,
                        });

                        addZkAccount({
                          ...newZkAccount,
                          isOnChain: false,
                          value: 0,
                          createdAt: dayjs().unix(),
                        });

                        toast({
                          title: "Created Subaccount",
                          description: `Successfully created ${tag}`,
                        });

                        await delay(200)
                        setSelectedTradingAccountTo(newZkAccount.address);
                        return;
                      }

                      setSelectedTradingAccountTo(newAddress);
                    }}
                  >
                    <SelectTrigger
                      id="dropdown-trading-account-to"
                      className="w-[180px]"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {zkAccounts.filter((account) => account.type !== "CoinSettled").map((subAccount) => {
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
                            {renameTag(subAccount.tag)}
                          </SelectItem>
                        );
                      })}
                      <SelectItem
                        key={"create"}
                        value={"create"}
                      >
                        Create new account
                      </SelectItem>
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
              onChange={(e) => setDepositAmount(e.target.value)}
              onClickPopover={(e) => {
                e.preventDefault();
                if (!depositRef.current?.value) return;

                const toDenom = e.currentTarget.value as BTCDenoms;

                const currentValue = new BTC(
                  depositDenom as BTCDenoms,
                  Big(depositRef.current.value)
                );

                const convertedAmount = currentValue
                  .convert(toDenom)
                  .toString();

                depositRef.current.value = convertedAmount;
                setDepositAmount(convertedAmount);
              }}
              type="number"
              step="any"
              placeholder="1.00"
              options={["BTC", "mBTC", "sats"]}
              setSelected={setDepositDenom}
              selected={depositDenom}
              ref={depositRef}
            // readOnly={ }
            />
          </div>

          <div className="pt-2">
            <Button
              disabled={
                isSubmitLoading ||
                !depositAmount ||
                depositAmount === "0" ||
                (fromAccountValue === "trading" && !selectedTradingAccountFrom) ||
                (toAccountValue === "trading" && !selectedTradingAccountTo)
              }
              type="submit"
              size="small"
            >
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
