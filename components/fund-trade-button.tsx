import React, { useCallback, useRef, useState } from 'react'
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from './dialog'
import { ArrowLeftRight, Loader2 } from 'lucide-react'
import { Input } from './input';
import useGetTwilightBTCBalance from '@/lib/hooks/useGetTwilightBtcBalance';
import { useTwilightStore } from '@/lib/providers/store';
import BTC from '@/lib/twilight/denoms';
import Big from 'big.js';
import Button from './button';
import { useWallet } from '@cosmos-kit/react-lite';
import { ChainWalletBase, WalletStatus } from '@cosmos-kit/core';
import { useToast } from '@/lib/hooks/useToast';
import { getRegisteredBTCAddress } from '@/lib/twilight/rest';
import { registerBTCAddress } from '@/lib/utils/btc-registration';
import { useSessionStore } from '@/lib/providers/session';
import { createZkAccount, createZkAccountWithBalance, createZkBurnTx } from '@/lib/twilight/zk';
import { ZkAccount } from '@/lib/types';
import { createFundingToTradingTransferMsg } from '@/lib/twilight/wallet';
import { ZkPrivateAccount } from '@/lib/zk/account';
import Link from 'next/link';
import { broadcastTradingTx } from '@/lib/api/zkos';
import { safeJSONParse, isUserRejection } from '@/lib/helpers';
import { twilightproject } from 'twilightjs';
import Long from 'long';

type Props = {
  type?: "icon" | "large",
  defaultTransferType?: "fund" | "trade",
}

function FundingTradeButton({
  type = "large",
  defaultTransferType = "fund",
}: Props) {
  const [transferType, setTransferType] = useState<'fund' | 'trade'>(defaultTransferType);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const { twilightSats } = useGetTwilightBTCBalance();

  const { toast } = useToast();

  const {
    status,
    mainWallet,
  } = useWallet()

  const chainWallet = mainWallet?.getChainWallet("nyks");
  const twilightAddress = chainWallet?.address;

  const twilightSatsString = new BTC('sats', Big(twilightSats)).convert('BTC').toFixed(8);

  const zkAccounts = useTwilightStore((state) => state.zk.zkAccounts);
  const tradingAccount = zkAccounts.find((account) => account.tag === 'main');

  const updateZkAccount = useTwilightStore((state) => state.zk.updateZkAccount);
  const addTransactionHistory = useTwilightStore(
    (state) => state.history.addTransaction
  );

  const tradingAccountBalance = tradingAccount?.value || 0;
  const tradingAccountBalanceString = new BTC('sats', Big(tradingAccountBalance)).convert('BTC').toFixed(8);

  const inputRef = useRef<HTMLInputElement>(null);
  const privateKey = useSessionStore((state) => state.privateKey);

  const handleFundingToTradeTransfer = useCallback(async (amount: number, chainWallet: ChainWalletBase) => {
    if (!tradingAccount || !twilightAddress) {
      return {
        success: false,
        message: "An unexpected error occurred",
      }
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
    })

    const broadcastResponse = await stargateClient.signAndBroadcast(
      twilightAddress,
      [transferMsg],
      "auto"
    );

    const senderZkPrivateAccount = await ZkPrivateAccount.create({
      signature: privateKey,
      balance: amount,
      existingAccount: transientAccount,
    });

    console.log("tradingAccount", tradingAccount);

    let privateTxSingleResult: any;

    if (!tradingAccount.value || !tradingAccount.isOnChain) {
      const newTradingAccount = await createZkAccount({
        tag: "main",
        signature: privateKey,
      });

      privateTxSingleResult = await senderZkPrivateAccount.privateTxSingle(
        amount,
        newTradingAccount.address,
        0,
      )

    }
    else {
      privateTxSingleResult = await senderZkPrivateAccount.privateTxSingle(
        amount,
        tradingAccount.address,
        tradingAccount.value,
      );
    }


    if (!privateTxSingleResult.success) {
      console.error(privateTxSingleResult.message);
      return {
        success: false,
        message: privateTxSingleResult.message,
      }
    }

    const {
      scalar: updatedTradingAccountScalar,
      txId,
      updatedAddress: updatedTradingAccountAddress,
    } = privateTxSingleResult.data;

    updateZkAccount(tradingAccount.address, {
      ...tradingAccount,
      address: updatedTradingAccountAddress,
      scalar: updatedTradingAccountScalar,
      value: Big(amount).add(tradingAccount.value || 0).toNumber(),
      isOnChain: true,
    })

    addTransactionHistory({
      date: new Date(),
      from: twilightAddress,
      fromTag: "Funding",
      to: updatedTradingAccountAddress,
      toTag: "Trading Account",
      tx_hash: txId,
      type: "Transfer",
      value: amount,
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
      success: true
    }

  }, [privateKey, toast, addTransactionHistory, updateZkAccount, tradingAccount, twilightAddress])

  const handleTradeToFundingTransfer = useCallback(async (amount: number, chainWallet: ChainWalletBase) => {
    if (!tradingAccount || !twilightAddress) {
      return {
        success: false,
        message: "An unexpected error occurred",
      }
    }

    const stargateClient = await chainWallet.getSigningStargateClient();

    const transientAccount = await createZkAccount({
      tag: Math.random().toString(36).substring(2, 15),
      signature: privateKey,
    });

    const senderZkPrivateAccount = await ZkPrivateAccount.create({
      signature: privateKey,
      existingAccount: tradingAccount,
    });

    console.log("tradingAccount.address", tradingAccount.address);

    const privateTxSingleResult =
      await senderZkPrivateAccount.privateTxSingle(
        amount,
        transientAccount.address,
      );

    if (!privateTxSingleResult.success) {
      console.error(privateTxSingleResult.message);
      return {
        success: false,
        message: privateTxSingleResult.message,
      }
    }

    const {
      scalar: updatedTransientScalar,
      txId,
      updatedAddress: updatedTransientAddress,
    } = privateTxSingleResult.data;

    console.log("txId", txId, "updatedAddess", updatedTransientAddress);

    const {
      success,
      msg: zkBurnMsg,
      zkAccountHex,
    } = await createZkBurnTx({
      signature: privateKey,
      zkAccount: {
        tag: tradingAccount.tag,
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
      }
    }

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
      }
    }

    const { mintBurnTradingBtc } =
      twilightproject.nyks.zkos.MessageComposer.withTypeUrl;

    console.log({
      btcValue: Long.fromNumber(amount),
      encryptScalar: updatedTransientScalar,
      mintOrBurn: false,
      qqAccount: zkAccountHex,
      twilightAddress,
    });

    const mintBurnMsg = mintBurnTradingBtc({
      btcValue: Long.fromNumber(amount),
      encryptScalar: updatedTransientScalar,
      mintOrBurn: false,
      qqAccount: zkAccountHex,
      twilightAddress,
    });

    toast({
      title: "Approval Pending",
      description: "Please approve the transaction in your wallet.",
    })

    const mintBurnRes = await stargateClient.signAndBroadcast(
      twilightAddress,
      [mintBurnMsg],
      "auto"
    );

    updateZkAccount(tradingAccount.address, {
      ...tradingAccount,
      address: senderZkPrivateAccount.get().address,
      scalar: senderZkPrivateAccount.get().scalar,
      value: senderZkPrivateAccount.get().value,
    });

    addTransactionHistory({
      date: new Date(),
      from: senderZkPrivateAccount.get().address,
      fromTag: "Trading Account",
      to: twilightAddress,
      toTag: "Funding",
      tx_hash: mintBurnRes.transactionHash,
      type: "Burn",
      value: amount
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
      success: true
    }


  }, [privateKey, toast, addTransactionHistory, updateZkAccount, tradingAccount, twilightAddress])

  async function handleTransfer() {
    if (!chainWallet || !twilightAddress || !tradingAccount) {
      toast({
        title: "Wallet is not connected",
        description: "Please connect your wallet to transfer.",
        variant: "error",
      });
      return;
    }

    setIsLoading(true);

    try {
      const registeredBtcAddress = await getRegisteredBTCAddress(twilightAddress);
      console.log(registeredBtcAddress)

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

      const amountToTransfer = new BTC("BTC", Big(inputValue)).convert("sats").toNumber();

      toast({
        title: "Submitting transfer",
        description: "Please do not close this page while your transfer is being submitted...",
      })

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

        const {
          success,
          message,
        } = await handleFundingToTradeTransfer(amountToTransfer, chainWallet);

        if (!success) {
          toast({
            title: "An unexpected error occurred during the transfer",
            description: (message as string),
            variant: "error"
          })
          return;
        }

        setInputValue('');
        setIsOpen(false);
      }
      else {
        if (amountToTransfer > tradingAccountBalance) {
          toast({
            title: "Insufficient funds",
            description: "You do not have enough funds to transfer",
            variant: "error",
          });
          return;
        }

        const {
          success,
          message,
        } = await handleTradeToFundingTransfer(amountToTransfer, chainWallet);

        if (!success) {
          toast({
            title: "An unexpected error occurred during the transfer",
            description: (message as string),
            variant: "error"
          })
          return;
        }

        setInputValue('');
        setIsOpen(false);
      }
    }
    catch (error) {
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
    }
    finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger disabled={status !== WalletStatus.Connected} asChild>
        {
          type === "icon" ? (
            <Button variant="ui" size="icon">
              <ArrowLeftRight className="h-4 w-4" />
            </Button>
          ) :
            (<button className="flex flex-row items-center justify-center gap-1 text-xs transition-colors duration-300  px-2 py-1 rounded-md disabled:hover:border-outline bg-primary text-background hover:bg-primary/80 border border-outline focus-visible:ring-1 focus-visible:ring-primary disabled:cursor-not-allowed disabled:text-gray-500 flex-shrink-0">
              Fund<ArrowLeftRight className="h-3 w-3" />Trade
            </button>
            )
        }
      </DialogTrigger>
      <DialogContent>
        <DialogTitle className="sr-only">Transfer Bitcoin</DialogTitle>
        <div className="space-y-2 text-center py-4">
          <div className="text-xl font-semibold">Transfer Bitcoin</div>
          <div className="text-sm text-primary/80">Transfer Bitcoin between your Funding and Trading balance.</div>
          <div className="flex flex-row items-center justify-center">
            <button
              onClick={() => setTransferType(transferType === 'fund' ? 'trade' : 'fund')}
              className="flex flex-row items-center justify-center gap-1 text-xs transition-colors duration-300 hover:border-primary px-2 py-1 rounded-md disabled:hover:border-outline border border-outline focus-visible:ring-1 focus-visible:ring-primary disabled:cursor-not-allowed disabled:text-gray-500 flex-shrink-0">
              {transferType === 'fund' ? 'Fund' : 'Trade'}<ArrowLeftRight className="h-3 w-3" />{transferType === 'fund' ? 'Trade' : 'Fund'}
            </button>
          </div>

          <div className="relative">
            <Input ref={inputRef}
              id="transfer-amount-input"
              type="number"
              step="any"
              placeholder="0.000"
              value={inputValue}
              onChange={(e) => {
                let value = e.currentTarget.value;

                // Remove any non-numeric characters except decimal point
                value = value.replace(/[^0-9.]/g, '');

                // Prevent multiple decimal points
                const decimalCount = (value.match(/\./g) || []).length;
                if (decimalCount > 1) {
                  const firstDecimalIndex = value.indexOf('.');
                  value = value.substring(0, firstDecimalIndex + 1) + value.substring(firstDecimalIndex + 1).replace(/\./g, '');
                }

                // Limit to 8 decimal places (BTC precision)
                const decimalIndex = value.indexOf('.');
                if (decimalIndex !== -1 && value.substring(decimalIndex + 1).length > 8) {
                  value = value.substring(0, decimalIndex + 9);
                }

                // Prevent leading zeros except for decimal values
                if (value.length > 1 && value[0] === '0' && value[1] !== '.') {
                  value = value.substring(1);
                }

                // Update the state and input field value
                setInputValue(value);
                e.currentTarget.value = value;
              }}
              disabled={isLoading}
            />

            <label htmlFor="transfer-amount-input" onClick={() => {
              setInputValue(transferType === "fund" ? twilightSatsString : tradingAccountBalanceString);
            }} className="hover:opacity-100 cursor-pointer select-none inset-y-0 right-0 absolute z-10 flex h-full items-center justify-center px-1.5 font-ui text-xs text-primary opacity-60 data-[state=open]:opacity-90">
              MAX: {transferType === "fund" ? twilightSatsString : tradingAccountBalanceString}
            </label>
          </div>
          <Button
            onClick={handleTransfer}
            className="w-full !mt-4" size="small" disabled={!inputValue || inputValue === '0' || isLoading}>
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Transfer'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default FundingTradeButton
