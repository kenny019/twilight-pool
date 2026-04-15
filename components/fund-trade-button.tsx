import React, { useCallback, useRef, useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "./dialog";
import { ArrowLeftRight, ArrowRight, ArrowUpDown, Loader2 } from "lucide-react";
import { Input } from "./input";
import useGetTwilightBTCBalance from "@/lib/hooks/useGetTwilightBtcBalance";
import { useTwilightStore } from "@/lib/providers/store";
import BTC from "@/lib/twilight/denoms";
import Big from "big.js";
import Button from "./button";
import { useWallet } from "@cosmos-kit/react-lite";
import { ChainWalletBase, WalletStatus } from "@cosmos-kit/core";
import { useToast } from "@/lib/hooks/useToast";
import { getRegisteredBTCAddress } from "@/lib/twilight/rest";
import { registerBTCAddress } from "@/lib/utils/btc-registration";
import { useSessionStore, useSignStatus } from "@/lib/providers/session";
import {
  createZkAccount,
  createZkAccountWithBalance,
  createZkBurnTx,
} from "@/lib/twilight/zk";
import { createFundingToTradingTransferMsg } from "@/lib/twilight/wallet";
import { ZkPrivateAccount } from "@/lib/zk/account";
import Link from "next/link";
import { broadcastTradingTx, queryUtxoForAddress } from "@/lib/api/zkos";
import { safeJSONParse, isUserRejection } from "@/lib/helpers";
import { twilightproject } from "twilightjs";
import Long from "long";
import { masterAccountQueue } from "@/lib/utils/masterAccountQueue";
import {
  hasUtxoData,
  serializeTxid,
  waitForUtxoUpdate,
} from "@/lib/utils/waitForUtxoUpdate";
import { useTwilightStoreApi } from "@/lib/providers/store";
import { assertCosmosTxSuccess } from "@/lib/utils/cosmosTx";
import {
  assertMasterAccountActionAllowed,
  createPendingMasterAccountRecovery,
  getMasterAccountBlockedMessage,
} from "@/lib/utils/masterAccountRecovery";

type Props = {
  type?: "icon" | "large" | "compact";
  defaultTransferType?: "fund" | "trade";
  children?: React.ReactNode;
};

function FundingTradeButton({
  type = "large",
  defaultTransferType = "fund",
  children,
}: Props) {
  const [transferType, setTransferType] = useState<"fund" | "trade">(
    defaultTransferType
  );
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const { twilightSats } = useGetTwilightBTCBalance();

  const { toast } = useToast();

  const { status, mainWallet } = useWallet();

  const chainWallet = mainWallet?.getChainWallet("nyks");
  const twilightAddress = chainWallet?.address;

  const twilightSatsString = new BTC("sats", Big(twilightSats))
    .convert("BTC")
    .toFixed(8);

  const zkAccounts = useTwilightStore((state) => state.zk.zkAccounts);
  const tradingAccount = zkAccounts.find((account) => account.tag === "main");

  const updateZkAccount = useTwilightStore((state) => state.zk.updateZkAccount);
  const addZkAccount = useTwilightStore((state) => state.zk.addZkAccount);
  const removeZkAccount = useTwilightStore((state) => state.zk.removeZkAccount);
  const setMasterAccountRecovery = useTwilightStore(
    (state) => state.zk.setMasterAccountRecovery
  );

  const addTransactionHistory = useTwilightStore(
    (state) => state.history.addTransaction
  );

  const tradingAccountBalance = tradingAccount?.value || 0;
  const tradingAccountBalanceString = new BTC(
    "sats",
    Big(tradingAccountBalance)
  )
    .convert("BTC")
    .toFixed(8);

  const inputRef = useRef<HTMLInputElement>(null);
  const privateKey = useSessionStore((state) => state.privateKey);
  const { retrySign } = useSignStatus();
  const storeApi = useTwilightStoreApi();

  const btcPriceUsd = useSessionStore((state) => state.price.btcPrice);

  // Derived display values for the dialog
  const fundingUsd = btcPriceUsd
    ? new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }).format((twilightSats / 1e8) * btcPriceUsd)
    : null;
  const tradingUsd = btcPriceUsd
    ? new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }).format((tradingAccountBalance / 1e8) * btcPriceUsd)
    : null;
  const parsedInput = parseFloat(inputValue) || 0;
  const parsedSats = Math.round(parsedInput * 1e8);
  const sourceBalance =
    transferType === "fund" ? twilightSats : tradingAccountBalance;
  const inputUsd = btcPriceUsd
    ? new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(parsedInput * btcPriceUsd)
    : null;
  const inputError: string | null = (() => {
    if (!inputValue || parsedInput <= 0) return null;
    if (parsedSats > sourceBalance) return "Insufficient funds";
    if (transferType === "fund" && parsedSats < 1000) return "Min. 0.00001 BTC";
    return null;
  })();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.currentTarget.value;
    value = value.replace(/[^0-9.]/g, "");
    const decimalCount = (value.match(/\./g) || []).length;
    if (decimalCount > 1) {
      const firstDecimalIndex = value.indexOf(".");
      value =
        value.substring(0, firstDecimalIndex + 1) +
        value.substring(firstDecimalIndex + 1).replace(/\./g, "");
    }
    const decimalIndex = value.indexOf(".");
    if (decimalIndex !== -1 && value.substring(decimalIndex + 1).length > 8) {
      value = value.substring(0, decimalIndex + 9);
    }
    if (value.length > 1 && value[0] === "0" && value[1] !== ".") {
      value = value.substring(1);
    }
    setInputValue(value);
  };

  const handleFundingToTradeTransfer = useCallback(
    async (amount: number, chainWallet: ChainWalletBase) => {
      const state = storeApi.getState();
      const currentTradingAccount =
        state.zk.zkAccounts.find((account) => account.tag === "main") ??
        tradingAccount;

      if (state.zk.masterAccountBlocked) {
        return {
          success: false,
          message: getMasterAccountBlockedMessage(
            state.zk.masterAccountBlockReason
          ),
        };
      }

      if (!currentTradingAccount || !twilightAddress) {
        return {
          success: false,
          message: "An unexpected error occurred",
        };
      }

      const stargateClient = await chainWallet.getSigningStargateClient();

      const { account: transientAccount, accountHex: transientAccountHex } =
        await createZkAccountWithBalance({
          tag: Math.random().toString(36).substring(2, 15),
          balance: amount,
          signature: privateKey,
        });

      const transferMsg = await createFundingToTradingTransferMsg({
        twilightAddress,
        transferAmount: amount,
        account: transientAccount,
        accountHex: transientAccountHex,
      });

      toast({
        title: "Approval Pending",
        description: "Please approve the transaction in your wallet.",
      });

      const broadcastResponse = assertCosmosTxSuccess(
        await stargateClient.signAndBroadcast(
          twilightAddress,
          [transferMsg],
          "auto"
        ),
        "Funding to trading transfer"
      );

      const senderZkPrivateAccount = await ZkPrivateAccount.create({
        signature: privateKey,
        balance: amount,
        existingAccount: transientAccount,
      });

      console.log("tradingAccount", tradingAccount);

      let privateTxSingleResult: any;

      if (!currentTradingAccount.value || !currentTradingAccount.isOnChain) {
        const newTradingAccount = await createZkAccount({
          tag: "main",
          signature: privateKey,
        });

        privateTxSingleResult = await senderZkPrivateAccount.privateTxSingle(
          amount,
          newTradingAccount.address,
          0
        );
      } else {
        privateTxSingleResult = await senderZkPrivateAccount.privateTxSingle(
          amount,
          currentTradingAccount.address,
          currentTradingAccount.value
        );
      }

      if (!privateTxSingleResult.success) {
        console.error(privateTxSingleResult.message);
        return {
          success: false,
          message: privateTxSingleResult.message,
        };
      }

      const {
        scalar: updatedTradingAccountScalar,
        txId,
        updatedAddress: updatedTradingAccountAddress,
      } = privateTxSingleResult.data;

      updateZkAccount(currentTradingAccount.address, {
        ...currentTradingAccount,
        address: updatedTradingAccountAddress,
        scalar: updatedTradingAccountScalar,
        value: Big(amount)
          .add(currentTradingAccount.value || 0)
          .toNumber(),
        isOnChain: true,
      });

      addTransactionHistory({
        date: new Date(),
        from: twilightAddress,
        fromTag: "Funding",
        to: updatedTradingAccountAddress,
        toTag: "Primary Trading Account",
        tx_hash: txId,
        type: "Transfer",
        value: amount,
        funding_sats_snapshot: twilightSats,
      });

      toast({
        title: "Success",
        description: (
          <div className="opacity-90">
            {`Successfully sent ${new BTC("sats", Big(amount))
              .convert("BTC")
              .toString()} BTC to your Primary Trading Account. `}
            <Link
              href={`${process.env.NEXT_PUBLIC_EXPLORER_URL as string}/txs/${broadcastResponse.transactionHash}`}
              target={"_blank"}
              className="text-sm underline hover:opacity-100"
            >
              Explorer link
            </Link>
          </div>
        ),
      });

      return {
        success: true,
      };
    },
    [
      privateKey,
      toast,
      addTransactionHistory,
      updateZkAccount,
      tradingAccount,
      storeApi,
      twilightAddress,
      twilightSats,
    ]
  );

  const handleTradeToFundingTransfer = useCallback(
    async (amount: number, chainWallet: ChainWalletBase) => {
      if (!twilightAddress) {
        return {
          success: false,
          message: "An unexpected error occurred",
        };
      }

      return masterAccountQueue.enqueue(async () => {
        const state = storeApi.getState();
        try {
          assertMasterAccountActionAllowed({
            masterAccountBlocked: state.zk.masterAccountBlocked,
            masterAccountBlockReason: state.zk.masterAccountBlockReason,
          });
        } catch (error) {
          return {
            success: false,
            message:
              error instanceof Error
                ? error.message
                : getMasterAccountBlockedMessage(
                    state.zk.masterAccountBlockReason
                  ),
          };
        }

        const currentTradingAccount = state.zk.zkAccounts.find(
          (a) => a.tag === "main"
        );
        if (!currentTradingAccount) {
          return {
            success: false,
            message: "Trading account not found",
          };
        }

        const stargateClient = await chainWallet.getSigningStargateClient();

        let cosmosScalar = "";
        let cosmosAccountHex = "";

        let newTradingAccount = {
          address: "",
          scalar: "",
          value: 0,
        };

        const transientAccount = await createZkAccount({
          tag: Math.random().toString(36).substring(2, 15),
          signature: privateKey,
        });

        const utxoBefore = await queryUtxoForAddress(
          currentTradingAccount.address
        );
        const previousTxid = hasUtxoData(utxoBefore)
          ? serializeTxid(utxoBefore.txid)
          : "";

        const senderZkPrivateAccount = await ZkPrivateAccount.create({
          signature: privateKey,
          existingAccount: currentTradingAccount,
        });

        console.log("tradingAccount.address", currentTradingAccount.address);

        const privateTxSingleResult =
          await senderZkPrivateAccount.privateTxSingle(
            amount,
            transientAccount.address
          );

        if (!privateTxSingleResult.success) {
          console.error(privateTxSingleResult.message);
          return {
            success: false,
            message: privateTxSingleResult.message,
          };
        }

        const {
          scalar: updatedTransientScalar,
          txId,
          updatedAddress: updatedTransientAddress,
        } = privateTxSingleResult.data;

        const updatedTradingAccount = {
          address: senderZkPrivateAccount.get().address,
          scalar: senderZkPrivateAccount.get().scalar,
          value: senderZkPrivateAccount.get().value,
        };

        const utxoWait = await waitForUtxoUpdate(
          updatedTradingAccount.address,
          previousTxid
        );
        if (!utxoWait.success) {
          updateZkAccount(currentTradingAccount.address, {
            ...updatedTradingAccount,
            type: "Coin",
            isOnChain: true,
            tag: currentTradingAccount.tag,
          });

          addZkAccount({
            address: updatedTransientAddress,
            scalar: updatedTransientScalar,
            value: amount,
            type: "Coin",
            tag: `temp ${updatedTransientAddress.slice(0, 6)}`,
            isOnChain: true,
          });

          addTransactionHistory({
            date: new Date(),
            from: currentTradingAccount.address,
            fromTag: "Primary Trading Account",
            to: updatedTransientAddress,
            toTag: `temp ${updatedTransientAddress.slice(0, 6)}`,
            tx_hash: txId,
            type: "Transfer",
            value: amount,
            funding_sats_snapshot: twilightSats,
          });

          setMasterAccountRecovery(
            createPendingMasterAccountRecovery({
              address: updatedTradingAccount.address,
              scalar: updatedTradingAccount.scalar,
              value: updatedTradingAccount.value,
              source: "trade to funding transfer",
              txId,
            })
          );

          return {
            success: false,
            message:
              "Trading account recovery is in progress after a delayed UTXO update. Please wait for recovery to finish before trying again.",
          };
        }

        console.log(
          "txId",
          txId,
          "updatedAddess",
          updatedTransientAddress,
          "tradingAccount.address",
          currentTradingAccount.address
        );

        newTradingAccount = updatedTradingAccount;

        // update in case burn fails
        updateZkAccount(currentTradingAccount.address, {
          ...newTradingAccount,
          type: "Coin",
          isOnChain: true,
          tag: currentTradingAccount.tag,
        });

        const {
          success,
          msg: zkBurnMsg,
          zkAccountHex,
        } = await createZkBurnTx({
          signature: privateKey,
          zkAccount: {
            tag: currentTradingAccount.tag,
            address: updatedTransientAddress,
            scalar: updatedTransientScalar,
            isOnChain: true,
            value: amount,
            type: "Coin",
          },
          initZkAccountAddress: transientAccount.address,
        });

        if (!success || !zkBurnMsg || !zkAccountHex) {
          console.error("error creating zkBurnTx msg");
          console.error({
            success,
            zkBurnMsg,
            zkAccountHex,
          });
          return {
            success: false,
            message: `Failed to create zkBurnTx msg`,
          };
        }

        console.log(
          "tradingAccount.address",
          currentTradingAccount.address,
          "2",
          updatedTransientAddress
        );
        // update in case broadcast fails
        updateZkAccount(newTradingAccount.address, {
          ...newTradingAccount,
          type: "Coin",
          isOnChain: false,
          tag: currentTradingAccount.tag,
        });

        console.log("updatedTransientAddress", updatedTransientAddress);

        toast({
          title: "Broadcasting transfer",
          description:
            "Please do not close this page while your transfer is being submitted...",
        });

        const tradingTxResString = await broadcastTradingTx(
          zkBurnMsg,
          twilightAddress
        );

        const tradingTxRes = safeJSONParse(tradingTxResString as string);

        if (!tradingTxRes.success || Object.hasOwn(tradingTxRes, "error")) {
          console.error("error broadcasting zkBurnTx msg", tradingTxRes);
          return {
            success: false,
            message: `Failed to broadcast zkBurnTx msg`,
          };
        }

        cosmosScalar = updatedTransientScalar;
        cosmosAccountHex = zkAccountHex;

        addZkAccount({
          address: updatedTransientAddress,
          scalar: updatedTransientScalar,
          value: amount,
          type: "Coin",
          tag: `temp ${updatedTransientAddress.slice(0, 6)}`,
          isOnChain: false,
          zkAccountHex,
        });

        const { mintBurnTradingBtc } =
          twilightproject.nyks.zkos.MessageComposer.withTypeUrl;

        console.log({
          btcValue: Long.fromNumber(amount),
          encryptScalar: cosmosScalar,
          mintOrBurn: false,
          qqAccount: cosmosAccountHex,
          twilightAddress,
        });

        const mintBurnMsg = mintBurnTradingBtc({
          btcValue: Long.fromNumber(amount),
          encryptScalar: cosmosScalar,
          mintOrBurn: false,
          qqAccount: cosmosAccountHex,
          twilightAddress,
        });

        toast({
          title: "Approval Pending",
          description: "Please approve the transaction in your wallet.",
        });

        const mintBurnRes = assertCosmosTxSuccess(
          await stargateClient.signAndBroadcast(
            twilightAddress,
            [mintBurnMsg],
            "auto"
          ),
          "Trading to funding burn"
        );

        removeZkAccount({
          address: updatedTransientAddress,
          scalar: updatedTransientScalar,
          value: amount,
          type: "Coin",
          tag: `temp ${updatedTransientAddress.slice(0, 6)}`,
          isOnChain: false,
          zkAccountHex,
        });

        updateZkAccount(currentTradingAccount.address, {
          ...currentTradingAccount,
          ...newTradingAccount,
          isOnChain: true,
        });

        addTransactionHistory({
          date: new Date(),
          from: newTradingAccount.address,
          fromTag: "Primary Trading Account",
          to: twilightAddress,
          toTag: "Funding",
          tx_hash: mintBurnRes.transactionHash,
          type: "Burn",
          value: amount,
          funding_sats_snapshot: twilightSats,
        });

        toast({
          title: "Success",
          description: (
            <div className="opacity-90">
              {`Successfully sent ${new BTC("sats", Big(amount))
                .convert("BTC")
                .toString()} BTC to the Funding Account.`}
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

        return {
          success: true,
        };
      });
    },
    [
      privateKey,
      toast,
      addTransactionHistory,
      updateZkAccount,
      addZkAccount,
      removeZkAccount,
      setMasterAccountRecovery,
      storeApi,
      twilightAddress,
      twilightSats,
    ]
  );

  async function handleTransfer() {
    if (!chainWallet || !twilightAddress) {
      toast({
        title: "Wallet is not connected",
        description: "Please connect your wallet to transfer.",
        variant: "error",
      });
      return;
    }

    if (!privateKey) {
      await retrySign();
      return;
    }

    if (!tradingAccount) {
      toast({
        title: "Trading account not found",
        description: "Please try again after signing.",
        variant: "error",
      });
      return;
    }

    setIsLoading(true);

    try {
      const registeredBtcAddress =
        await getRegisteredBTCAddress(twilightAddress);
      console.log(registeredBtcAddress);

      if (!registeredBtcAddress) {
        const result = await registerBTCAddress(chainWallet);

        if (!result.success) {
          toast({
            title: "Unable to register BTC address",
            description: result.error || "Failed to register BTC address",
            variant: "error",
          });
          return;
        }
      }

      const amountToTransfer = new BTC("BTC", Big(inputValue))
        .convert("sats")
        .toNumber();

      toast({
        title: "Submitting transfer",
        description:
          "Please do not close this page while your transfer is being submitted...",
      });

      if (transferType === "fund") {
        if (amountToTransfer > twilightSats) {
          toast({
            title: "Insufficient funds",
            description: "You do not have enough funds to transfer",
            variant: "error",
          });
          return;
        }

        if (amountToTransfer < 1000) {
          toast({
            title: "Invalid amount",
            description: "Please enter an amount greater than 0.00001 BTC",
            variant: "error",
          });
          return;
        }

        const { success, message } = await handleFundingToTradeTransfer(
          amountToTransfer,
          chainWallet
        );

        if (!success) {
          toast({
            title: "An unexpected error occurred during the transfer",
            description: message as string,
            variant: "error",
          });
          return;
        }

        setInputValue("");
        setIsOpen(false);
      } else {
        if (amountToTransfer > tradingAccountBalance) {
          toast({
            title: "Insufficient funds",
            description: "You do not have enough funds to transfer",
            variant: "error",
          });
          return;
        }

        const { success, message } = await handleTradeToFundingTransfer(
          amountToTransfer,
          chainWallet
        );

        if (!success) {
          toast({
            title: "An unexpected error occurred during the transfer",
            description: message as string,
            variant: "error",
          });
          return;
        }

        setInputValue("");
        setIsOpen(false);
      }
    } catch (error) {
      if (isUserRejection(error)) {
        toast({
          title: "Transaction rejected",
          description: "You declined the transaction in your wallet.",
        });
        return;
      }
      console.error(error);
      toast({
        title: "An unexpected error has occurred",
        description: "An unexpected error has occurred, please try again later",
        variant: "error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) setInputValue("");
      }}
    >
      <DialogTrigger
        disabled={children == null && status !== WalletStatus.Connected}
        asChild
      >
        {children ??
          (type === "icon" ? (
            <Button variant="ui" size="icon">
              <ArrowLeftRight className="h-4 w-4" />
            </Button>
          ) : type === "compact" ? (
            <button className="flex flex-shrink-0 flex-row items-center justify-center gap-1.5 rounded-md border border-theme/60 bg-theme/10 px-2.5 py-1.5 text-xs font-medium text-primary/70 transition-colors duration-300 hover:border-theme/80 hover:bg-theme/20 hover:text-primary disabled:cursor-not-allowed disabled:border-outline disabled:bg-transparent disabled:text-gray-500 disabled:opacity-40 disabled:hover:border-outline">
              <ArrowLeftRight className="h-3.5 w-3.5" />
              Transfer
            </button>
          ) : (
            <button className="flex flex-shrink-0 flex-row items-center justify-center gap-1.5 rounded-lg border border-theme/60 bg-theme/10 px-3 py-1.5 text-[13px] font-medium text-primary/70 shadow-sm transition-colors duration-300 hover:border-theme/80 hover:bg-theme/20 hover:text-primary focus-visible:ring-1 focus-visible:ring-theme/60 disabled:cursor-not-allowed disabled:border-outline disabled:bg-transparent disabled:text-gray-500 disabled:hover:border-outline">
              <ArrowLeftRight className="h-3.5 w-3.5" />
              Transfer
            </button>
          ))}
      </DialogTrigger>

      <DialogContent className="max-w-[calc(100vw-2rem)] gap-0 p-0 md:max-w-sm">
        <DialogTitle className="sr-only">Transfer Bitcoin</DialogTitle>

        <div className="px-5 pb-5 pt-10">
          {/* Header */}
          <div className="mb-4">
            <div className="text-base font-semibold text-primary">
              Transfer Bitcoin
            </div>
            <div className="mt-0.5 text-xs text-primary-accent">
              Move funds between your Funding and Trading accounts.
            </div>
          </div>

          {/* FROM card */}
          <div className="border-outline/70 rounded-lg border bg-background/50 p-3">
            <span className="text-[10px] font-medium uppercase tracking-wide text-primary-accent/60">
              From
            </span>
            <div className="mt-1.5 flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-primary">
                {transferType === "fund"
                  ? "Funding"
                  : "Primary Trading Account"}
              </span>
              <span className="shrink-0 text-xs tabular-nums text-primary">
                {transferType === "fund"
                  ? twilightSatsString
                  : tradingAccountBalanceString}{" "}
                BTC
              </span>
            </div>
            <div className="mt-0.5 text-right text-[10px] tabular-nums text-primary-accent/50">
              ≈{" "}
              {transferType === "fund"
                ? (fundingUsd ?? "—")
                : (tradingUsd ?? "—")}
            </div>
          </div>

          {/* Swap direction button */}
          <div className="my-1.5 flex justify-center">
            <button
              type="button"
              onClick={() => {
                setTransferType(transferType === "fund" ? "trade" : "fund");
                setInputValue("");
              }}
              className="border-outline/70 flex h-11 w-11 touch-manipulation items-center justify-center rounded-full border bg-background text-primary-accent transition-colors hover:border-primary/50 hover:bg-primary/5 hover:text-primary"
              aria-label="Swap transfer direction"
            >
              <ArrowUpDown className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* TO card */}
          <div className="border-outline/70 rounded-lg border bg-background/50 p-3">
            <span className="text-[10px] font-medium uppercase tracking-wide text-primary-accent/60">
              To
            </span>
            <div className="mt-1.5 flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-primary">
                {transferType === "fund"
                  ? "Primary Trading Account"
                  : "Funding"}
              </span>
              <span className="shrink-0 text-xs tabular-nums text-primary">
                {transferType === "fund"
                  ? tradingAccountBalanceString
                  : twilightSatsString}{" "}
                BTC
              </span>
            </div>
            <div className="mt-0.5 text-right text-[10px] tabular-nums text-primary-accent/50">
              ≈{" "}
              {transferType === "fund"
                ? (tradingUsd ?? "—")
                : (fundingUsd ?? "—")}
            </div>
          </div>

          {/* Amount */}
          <div className="mt-4">
            <div className="mb-1 flex items-center justify-between">
              <label
                htmlFor="transfer-amount-input"
                className="text-xs text-primary-accent"
              >
                Amount (BTC)
              </label>
              <button
                type="button"
                onClick={() =>
                  setInputValue(
                    transferType === "fund"
                      ? twilightSatsString
                      : tradingAccountBalanceString
                  )
                }
                className="text-[10px] font-medium text-theme/70 transition-colors hover:text-theme"
              >
                MAX
              </button>
            </div>

            <Input
              ref={inputRef}
              id="transfer-amount-input"
              type="text"
              inputMode="decimal"
              placeholder="0.00000000"
              value={inputValue}
              onChange={handleInputChange}
              disabled={isLoading}
              className="tabular-nums"
            />

            <div className="mt-1.5 flex min-h-[16px] items-center justify-between gap-2">
              <span className="text-[11px] tabular-nums text-primary-accent/60">
                {parsedInput > 0 && inputUsd !== null ? `≈ ${inputUsd}` : ""}
              </span>
              {inputError && (
                <span className="text-[11px] text-red/80">{inputError}</span>
              )}
            </div>
          </div>

          {/* CTA */}
          <Button
            variant="ui"
            onClick={handleTransfer}
            className="mt-3 w-full gap-1.5 border-theme/60 bg-theme/[0.12] text-primary hover:border-theme hover:bg-theme/[0.18] disabled:border-outline disabled:bg-transparent"
            size="small"
            disabled={
              !inputValue || parsedInput <= 0 || isLoading || !!inputError
            }
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                {transferType === "fund"
                  ? "Transfer to Trading"
                  : "Transfer to Funding"}
                <ArrowRight className="h-3.5 w-3.5" />
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default FundingTradeButton;
