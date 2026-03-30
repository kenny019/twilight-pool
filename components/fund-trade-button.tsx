import React, { useCallback, useRef, useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "./dialog";
import { ArrowLeftRight, Loader2 } from "lucide-react";
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
  type?: "icon" | "large";
  defaultTransferType?: "fund" | "trade";
};

function FundingTradeButton({
  type = "large",
  defaultTransferType = "fund",
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
        toTag: "Trading Account",
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
              .toString()} BTC to your Trading Account. `}
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
                : getMasterAccountBlockedMessage(state.zk.masterAccountBlockReason),
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
            fromTag: "Trading Account",
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
          fromTag: "Trading Account",
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
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger disabled={status !== WalletStatus.Connected} asChild>
        {type === "icon" ? (
          <Button variant="ui" size="icon">
            <ArrowLeftRight className="h-4 w-4" />
          </Button>
        ) : (
          <button className="flex flex-shrink-0 flex-row items-center justify-center gap-1 rounded-md border  border-outline bg-primary px-2 py-1 text-xs text-background transition-colors duration-300 hover:bg-primary/80 focus-visible:ring-1 focus-visible:ring-primary disabled:cursor-not-allowed disabled:text-gray-500 disabled:hover:border-outline">
            Fund
            <ArrowLeftRight className="h-3 w-3" />
            Trade
          </button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogTitle className="sr-only">Transfer Bitcoin</DialogTitle>
        <div className="space-y-2 py-4 text-center">
          <div className="text-xl font-semibold">Transfer Bitcoin</div>
          <div className="text-sm text-primary/80">
            Transfer Bitcoin between your Funding and Trading balance.
          </div>
          <div className="flex flex-row items-center justify-center">
            <button
              onClick={() =>
                setTransferType(transferType === "fund" ? "trade" : "fund")
              }
              className="flex flex-shrink-0 flex-row items-center justify-center gap-1 rounded-md border border-outline px-2 py-1 text-xs transition-colors duration-300 hover:border-primary focus-visible:ring-1 focus-visible:ring-primary disabled:cursor-not-allowed disabled:text-gray-500 disabled:hover:border-outline"
            >
              {transferType === "fund" ? "Fund" : "Trade"}
              <ArrowLeftRight className="h-3 w-3" />
              {transferType === "fund" ? "Trade" : "Fund"}
            </button>
          </div>

          <div className="relative">
            <Input
              ref={inputRef}
              id="transfer-amount-input"
              type="number"
              step="any"
              placeholder="0.000"
              value={inputValue}
              onChange={(e) => {
                let value = e.currentTarget.value;

                // Remove any non-numeric characters except decimal point
                value = value.replace(/[^0-9.]/g, "");

                // Prevent multiple decimal points
                const decimalCount = (value.match(/\./g) || []).length;
                if (decimalCount > 1) {
                  const firstDecimalIndex = value.indexOf(".");
                  value =
                    value.substring(0, firstDecimalIndex + 1) +
                    value.substring(firstDecimalIndex + 1).replace(/\./g, "");
                }

                // Limit to 8 decimal places (BTC precision)
                const decimalIndex = value.indexOf(".");
                if (
                  decimalIndex !== -1 &&
                  value.substring(decimalIndex + 1).length > 8
                ) {
                  value = value.substring(0, decimalIndex + 9);
                }

                // Prevent leading zeros except for decimal values
                if (value.length > 1 && value[0] === "0" && value[1] !== ".") {
                  value = value.substring(1);
                }

                // Update the state and input field value
                setInputValue(value);
                e.currentTarget.value = value;
              }}
              disabled={isLoading}
            />

            <label
              htmlFor="transfer-amount-input"
              onClick={() => {
                setInputValue(
                  transferType === "fund"
                    ? twilightSatsString
                    : tradingAccountBalanceString
                );
              }}
              className="absolute inset-y-0 right-0 z-10 flex h-full cursor-pointer select-none items-center justify-center px-1.5 font-ui text-xs text-primary opacity-60 hover:opacity-100 data-[state=open]:opacity-90"
            >
              MAX:{" "}
              {transferType === "fund"
                ? twilightSatsString
                : tradingAccountBalanceString}
            </label>
          </div>
          <Button
            onClick={handleTransfer}
            className="!mt-4 w-full"
            size="small"
            disabled={!inputValue || inputValue === "0" || isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              "Transfer"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default FundingTradeButton;
