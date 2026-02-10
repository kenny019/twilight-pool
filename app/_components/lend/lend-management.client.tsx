"use client";
import Button from "@/components/button";
import { PopoverInput } from "@/components/input";
import Resource from "@/components/resource";
import { Text } from "@/components/typography";
import { sendLendOrder } from "@/lib/api/client";
import { queryLendOrder } from '@/lib/api/relayer';
import { queryTransactionHashByRequestId, queryTransactionHashes } from '@/lib/api/rest';
import { retry, isUserRejection } from '@/lib/helpers';
import useGetTwilightBTCBalance from '@/lib/hooks/useGetTwilightBtcBalance';
import { useToast } from "@/lib/hooks/useToast";
import { useSessionStore } from "@/lib/providers/session";
import { useTwilightStore } from "@/lib/providers/store";
import BTC, { BTCDenoms } from "@/lib/twilight/denoms";
import { createFundingToTradingTransferMsg } from '@/lib/twilight/wallet';
import { createZkAccountWithBalance, createZkLendOrder } from "@/lib/twilight/zk";
import { createQueryLendOrderMsg } from '@/lib/twilight/zkos';
import { ZkAccount } from '@/lib/types';
import { WalletStatus } from '@cosmos-kit/core';
import { useWallet } from '@cosmos-kit/react-lite';
import Big from "big.js";
import { Loader2 } from "lucide-react";
import Link from 'next/link';
import React, { useCallback, useMemo, useRef, useState } from "react";
import dayjs from "dayjs";
import { ZkPrivateAccount } from '@/lib/zk/account';

const LendManagement = () => {
  const { toast } = useToast();
  const privateKey = useSessionStore((state) => state.privateKey);
  const { status } = useWallet();

  const { twilightSats } =
    useGetTwilightBTCBalance();

  const zkAccounts = useTwilightStore((state) => state.zk.zkAccounts);
  const addZkAccount = useTwilightStore((state) => state.zk.addZkAccount);
  const lendOrders = useTwilightStore((state) => state.lend.lends);
  const poolInfo = useTwilightStore((state) => state.lend.poolInfo);

  const [approxPoolShare, setApproxPoolShare] = useState<string>("0.00000000");

  const addLendOrder = useTwilightStore((state) => state.lend.addLend);
  const addLendHistory = useTwilightStore((state) => state.lend.addLendHistory);

  const addTransactionHistory = useTwilightStore(
    (state) => state.history.addTransaction
  );
  const updateZkAccount = useTwilightStore((state) => state.zk.updateZkAccount);
  const btcPrice = useSessionStore((state) => state.price.btcPrice);

  const [depositDenom, setDepositDenom] = useState<string>("BTC");
  const [isSubmitLoading, setIsSubmitLoading] = useState(false);

  const { mainWallet } = useWallet();

  const depositRef = useRef<HTMLInputElement>(null);

  async function submitDepositForm(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const tag = `BTC lend ${zkAccounts.length}`

    const chainWallet = mainWallet?.getChainWallet("nyks");

    if (!chainWallet) {
      toast({
        title: "Wallet is not connected",
        description: "Please connect your wallet to deposit.",
      })
      return;
    }

    if (!depositRef.current?.value) {
      toast({
        title: "Invalid amount",
        description: "Please enter an amount to deposit.",
      })
      return;
    }

    const twilightAddress = chainWallet.address;

    if (!twilightAddress) {
      console.error("no twilightAddress");
      return;
    }

    setIsSubmitLoading(true);

    toast({
      title: "Submitting deposit",
      description: "Please do not close this page while your deposit is being submitted...",
    })

    const transferAmount = new BTC(
      depositDenom as BTCDenoms,
      Big(depositRef.current.value)
    )
      .convert("sats")
      .toNumber();

    const stargateClient = await chainWallet.getSigningStargateClient();

    console.log("funding transfer signature", privateKey);
    const { account: newTradingAccount, accountHex: newTradingAccountHex } =
      await createZkAccountWithBalance({
        tag: tag,
        balance: transferAmount,
        signature: privateKey,
      });

    const fundingTransferMsg = await createFundingToTradingTransferMsg({
      twilightAddress,
      transferAmount,
      account: newTradingAccount,
      accountHex: newTradingAccountHex,
    });

    console.log("msg", fundingTransferMsg);

    try {
      const res = await stargateClient.signAndBroadcast(
        twilightAddress,
        [fundingTransferMsg],
        "auto"
      );

      console.log("sent sats from funding to trading", transferAmount);
      console.log("res", res);

      const zkAccountToUse: ZkAccount = {
        scalar: newTradingAccount.scalar,
        type: "Coin",
        address: newTradingAccount.address,
        tag: tag,
        isOnChain: true,
        value: transferAmount,
        createdAt: dayjs().unix(),
      }

      addZkAccount(zkAccountToUse);

      // hack to make sure utxo exists on chain before creating the lend order
      await ZkPrivateAccount.create({
        signature: privateKey,
        balance: transferAmount,
        existingAccount: zkAccountToUse,
      });

      const { success, msg } = await createZkLendOrder({
        zkAccount: zkAccountToUse,
        deposit: transferAmount,
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
        const lendOrderRes = await retry<
          ReturnType<typeof queryTransactionHashes>,
          string
        >(
          queryTransactionHashByRequestId,
          30,
          data.result.id_key,
          1000,
          (txHash) => {
            const found = txHash.result.find(
              (tx) => tx.order_status === "FILLED"
            );

            return found ? true : false;
          }
        );

        if (!lendOrderRes.success) {
          console.error("lend order deposit not successful");
          toast({
            variant: "error",
            title: "Unable to submit lend order",
            description: "An error has occurred, try again later.",
          });
          setIsSubmitLoading(false);
          return;
        }

        const lendOrderData = lendOrderRes.data.result.find(
          (tx) => tx.order_status === "FILLED"
        );

        const tx_hash = lendOrderData?.tx_hash;

        if (!tx_hash) {
          toast({
            variant: "error",
            title: "Unable to submit lend order",
            description: "An error has occurred, try again later.",
          });
          setIsSubmitLoading(false);
          return;
        }

        toast({
          title: "Success",
          description: <div className="opacity-90">
            {`Successfully submitted lend order for ${new BTC("sats", Big(transferAmount))
              .convert("BTC")
              .toString()} BTC. `}
            <Link
              href={`${process.env.NEXT_PUBLIC_EXPLORER_URL as string}/tx/${tx_hash}`}
              target={"_blank"}
              className="text-sm underline hover:opacity-100"
            >
              Explorer link
            </Link>
          </div>
        });

        const queryLendOrderMsg = await createQueryLendOrderMsg({
          address: zkAccountToUse.address,
          signature: privateKey,
          orderStatus: "FILLED",
        });

        const queryLendOrderRes = await queryLendOrder(queryLendOrderMsg);
        console.log(queryLendOrderRes);

        if (!queryLendOrderRes) {
          console.error(queryLendOrderRes);
          toast({
            variant: "error",
            title: "Unable to query lend order",
            description: "An error has occurred, try again later.",
          });
          setIsSubmitLoading(false);
          return;
        }

        const newLendOrder = {
          accountAddress: zkAccountToUse.address,
          uuid: data.result.id_key as string,
          orderStatus: "LENDED",
          value: transferAmount,
          timestamp: new Date(),
          apy: poolInfo?.apy,
          tx_hash: tx_hash,
          npoolshare: Number(queryLendOrderRes.result.npoolshare),
          pool_share_price_entry: btcPrice,
        }

        addLendOrder(newLendOrder);
        addLendHistory(newLendOrder);

        addTransactionHistory({
          date: new Date(),
          from: zkAccountToUse.address,
          fromTag: zkAccountToUse.tag,
          to: zkAccountToUse.address,
          toTag: zkAccountToUse.tag,
          tx_hash: tx_hash,
          type: "Deposit Lend",
          value: transferAmount,
        });

        updateZkAccount(zkAccountToUse.address, {
          ...zkAccountToUse,
          type: "Memo",
        });

        // Reset form
        if (depositRef.current) {
          depositRef.current.value = "";
        }

      } else {
        toast({
          variant: "error",
          title: "Unable to submit lend order",
          description: "An error has occurred, try again later.",
        });
      }
    } catch (err) {
      if (isUserRejection(err)) {
        toast({
          title: "Transaction rejected",
          description: "You declined the transaction in your wallet.",
        });
      } else {
        console.error(err);
        toast({
          variant: "error",
          title: "Unable to submit lend order",
          description: "An error has occurred, try again later.",
        });
      }
    }

    setIsSubmitLoading(false);
  }

  const availableBalance = BTC.format(new BTC("sats", Big(twilightSats))
    .convert("BTC"), "BTC")

  const calculateApproxPoolShare = useCallback((value: string) => {
    const amount = Big(value || 0).toNumber()
    const sats = new BTC(depositDenom as BTCDenoms, Big(amount)).convert("sats").toNumber()

    const poolShare = (sats / (poolInfo?.pool_share || 0));

    setApproxPoolShare(poolShare.toFixed(8))
  }, [depositDenom, poolInfo?.pool_share])

  function renderDepositForm() {
    return (
      <form onSubmit={submitDepositForm} className="space-y-4">
        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <Text className="text-primary-accent" asChild>
              <label htmlFor="amount-dep">Amount BTC</label>
            </Text>
            <Text className="text-primary-accent">
              Available: {availableBalance} BTC
            </Text>
          </div>

          <PopoverInput
            id="amount-dep"
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
            placeholder="0.00"
            options={["BTC", "mBTC", "sats"]}
            setSelected={setDepositDenom}
            selected={depositDenom}
            ref={depositRef}
            onChange={(e) => {
              const value = e.target.value;
              calculateApproxPoolShare(value);
            }}
          />
        </div>

        <div className="flex justify-between text-sm">
          <Text className="text-primary-accent">Approx Pool Share</Text>
          <Text>≈ {approxPoolShare}</Text>
        </div>

        <Button disabled={isSubmitLoading || status !== WalletStatus.Connected} type="submit" className="w-full">
          <Resource
            isLoaded={!isSubmitLoading}
            placeholder={<Loader2 className="animate-spin" />}
          >
            Deposit
          </Resource>
        </Button>
      </form>
    );
  }

  return (
    <div className="space-y-4">
      {renderDepositForm()}
    </div>
  );
};

export default LendManagement; 