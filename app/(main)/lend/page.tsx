"use client";

import PoolInfo from "@/app/_components/lend/pool-info.client";
import ApyChart from "@/app/_components/lend/apy-chart.client";
import MyInvestment from "@/app/_components/lend/my-investment.client";
import LendManagement from "@/app/_components/lend/lend-management.client";
import LendOrdersTable from "@/app/_components/trade/details/tables/lend-orders/lend-orders-table.client";
import LendHistoryTable from "@/app/_components/trade/details/tables/lend-history/lend-history-table.client";
import Button from "@/components/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/tabs";
import { Text } from "@/components/typography";
import { Separator } from "@/components/seperator";
import { executeLendOrder } from "@/lib/api/client";
import { queryTransactionHashByRequestId, queryTransactionHashes } from "@/lib/api/rest";
import { retry, safeJSONParse } from "@/lib/helpers";
import useRedirectUnconnected from "@/lib/hooks/useRedirectUnconnected";
import { useToast } from "@/lib/hooks/useToast";
import { useSessionStore } from "@/lib/providers/session";
import { useTwilightStore } from "@/lib/providers/store";
import { createQueryLendOrderMsg, executeTradeLendOrderMsg } from "@/lib/twilight/zkos";
import { WalletStatus } from "@cosmos-kit/core";
import { useWallet } from "@cosmos-kit/react-lite";
import { Loader2 } from "lucide-react";
import React, { useState, useMemo, useCallback } from "react";
import { LendOrder, ZkAccount } from "@/lib/types";
import { useGetLendPoolInfo } from '@/lib/hooks/useGetLendPoolInfo';
import { queryLendOrder } from '@/lib/api/relayer';
import Big from 'big.js';
import { usePriceFeed } from '@/lib/providers/feed';
import { createZkAccount, createZkBurnTx } from '@/lib/twilight/zk';
import { broadcastTradingTx } from '@/lib/api/zkos';
import { twilightproject } from 'twilightjs';
import Long from 'long';
import BTC from '@/lib/twilight/denoms';
import Link from 'next/link';
import { ZkPrivateAccount } from '@/lib/zk/account';

const formatTag = (tag: string) => {
  if (tag === "main") {
    return "Trading Account";
  }

  return tag;
}

type TabType = "active-orders" | "lend-history";

const Page = () => {
  useRedirectUnconnected();
  useGetLendPoolInfo()

  const { toast } = useToast();

  const [currentTab, setCurrentTab] = useState<TabType>("active-orders");
  const [isSettleLoading, setIsSettleLoading] = useState(false);
  const [settlingOrderId, setSettlingOrderId] = useState<string | null>(null);

  const { getCurrentPrice } = usePriceFeed();

  const privateKey = useSessionStore((state) => state.privateKey);
  const lendOrders = useTwilightStore((state) => state.lend.lends);

  const lendHistoryData = useTwilightStore((state) => state.lend.lendHistory);
  const addLendHistory = useTwilightStore((state) => state.lend.addLendHistory);

  const poolInfo = useTwilightStore((state) => state.lend.poolInfo);

  const zKAccounts = useTwilightStore((state) => state.zk.zkAccounts);
  const updateZkAccount = useTwilightStore((state) => state.zk.updateZkAccount);
  const removeZkAccount = useTwilightStore((state) => state.zk.removeZkAccount);

  const removeLend = useTwilightStore((state) => state.lend.removeLend);
  const addTransactionHistory = useTwilightStore(
    (state) => state.history.addTransaction
  );

  const getAccountTag = useCallback((address: string) => {
    const account = zKAccounts.find(account => account.address === address);
    return formatTag(account?.tag || "");
  }, [zKAccounts]);

  // Filter lend orders for active vs history
  const activeLendOrders = useMemo(() => {
    return lendOrders.filter(order => order.orderStatus === "LENDED").map(order => ({
      ...order,
      accountTag: getAccountTag(order.accountAddress)
    }));
  }, [lendOrders, getAccountTag]);

  const lendHistory = useMemo(() => {
    return lendHistoryData.map(order => ({
      ...order,
      accountTag: getAccountTag(order.accountAddress)
    }));
  }, [lendHistoryData, getAccountTag]);

  const getPoolSharePrice = () => poolInfo?.pool_share || 0

  const { mainWallet } = useWallet();
  const chainWallet = mainWallet?.getChainWallet("nyks");

  const twilightAddress = chainWallet?.address;

  async function settleLendOrder(order: LendOrder) {
    try {
      if (!chainWallet || !twilightAddress || !privateKey) {
        console.error("chainWallet not found");
        return;
      }

      toast({
        title: "Withdrawing lend order",
        description: "Please do not close this page until the lend order is withdrawn...",
      })

      setIsSettleLoading(true);
      setSettlingOrderId(order.accountAddress); // Use accountAddress as unique identifier

      const lendOrderRes = await retry<
        ReturnType<typeof queryTransactionHashes>,
        string
      >(
        queryTransactionHashes,
        30,
        order.accountAddress,
        1000,
        (txHash) => {
          const found = txHash.result.find(
            (tx) => tx.order_status === "FILLED"
          );

          return found ? true : false;
        }
      );

      if (!lendOrderRes.success) {
        console.error("lend order settle not successful");
        setIsSettleLoading(false);
        setSettlingOrderId(null);
        return;
      }

      const lendOrders = lendOrderRes.data;

      const lendOrderData = lendOrders.result.find(
        (tx) => tx.order_status === "FILLED"
      );

      if (!lendOrderData) {
        setIsSettleLoading(false);
        setSettlingOrderId(null);
        return;
      }

      const msg = await executeTradeLendOrderMsg({
        outputMemo: lendOrderData.output,
        signature: privateKey,
        address: lendOrderData.account_id,
        uuid: lendOrderData.order_id,
        orderStatus: lendOrderData.order_status,
        orderType: lendOrderData.order_type,
        transactionType: "LENDTX",
        executionPricePoolshare: 1,
      });

      const executeLendRes = await executeLendOrder(msg);
      console.log("executeLendRes", executeLendRes);

      const requestId = executeLendRes.result.id_key;

      const requestIdRes = await retry<
        ReturnType<typeof queryTransactionHashes>,
        string
      >(
        queryTransactionHashByRequestId,
        30,
        requestId,
        1000,
        (txHash) => {
          const found = txHash.result.find(
            (tx) => tx.order_status === "SETTLED"
          );

          return found ? true : false;
        }
      );

      if (!requestIdRes.success) {
        console.error("lend order settle not successful");
        setIsSettleLoading(false);
        setSettlingOrderId(null);
        return;
      }

      const requestIdData = requestIdRes.data.result.find(
        (tx) => tx.order_status === "SETTLED"
      );

      const tx_hash = requestIdData?.tx_hash;

      console.log("requestIdData", requestIdData);

      removeLend(order);

      const selectedZkAccount = zKAccounts.find(
        (account) => account.address === order.accountAddress
      );

      if (!selectedZkAccount) {
        console.error("selectedZkAccount not found");
        setIsSettleLoading(false);
        setSettlingOrderId(null);
        return;
      }

      const queryLendOrderMsg = await createQueryLendOrderMsg({
        address: order.accountAddress,
        signature: privateKey,
        orderStatus: "SETTLED",
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
        setIsSettleLoading(false);
        setSettlingOrderId(null);
        return;
      }

      const newBalance = Math.round(Big(queryLendOrderRes.result.new_lend_state_amount).toNumber())
      // const newBalance = Math.round(Big(queryLendOrderRes.result.balance).toNumber())

      console.log("newBalance", newBalance);

      addTransactionHistory({
        date: new Date(),
        from: selectedZkAccount?.address || "",
        fromTag: selectedZkAccount?.tag || "",
        to: order.accountAddress,
        toTag: selectedZkAccount?.tag || "",
        tx_hash: tx_hash || "",
        value: newBalance,
        type: "Withdraw Lend",
      });

      addLendHistory({
        ...order,
        orderStatus: "SETTLED",
        timestamp: new Date(),
        tx_hash: tx_hash,
        value: newBalance,
        payment: Big(queryLendOrderRes.result.payment).toNumber() || 0,
      })

      setIsSettleLoading(false);
      setSettlingOrderId(null);

      toast({
        title: "Success",
        description: "Withdrew lend order successfully",
      });

      const updatedSelectedZkAccount: ZkAccount = {
        ...selectedZkAccount,
        type: "CoinSettled",
        value: newBalance,
      };

      updateZkAccount(selectedZkAccount.address, updatedSelectedZkAccount);


      const stargateClient = await chainWallet.getSigningStargateClient();

      const transientAccount = await createZkAccount({
        tag: Math.random().toString(36).substring(2, 15),
        signature: privateKey,
      });

      const senderZkPrivateAccount = await ZkPrivateAccount.create({
        signature: privateKey,
        existingAccount: updatedSelectedZkAccount,
      });

      const privateTxSingleResult =
        await senderZkPrivateAccount.privateTxSingle(
          newBalance,
          transientAccount.address,
        );

      if (!privateTxSingleResult.success) {
        console.error(privateTxSingleResult.message);
        return;
      }

      const {
        scalar: updatedTransientScalar,
        txId,
        updatedAddress: updatedTransientAddress,
      } = privateTxSingleResult.data;

      const {
        success,
        msg: zkBurnMsg,
        zkAccountHex,
      } = await createZkBurnTx({
        signature: privateKey,
        zkAccount: {
          tag: selectedZkAccount.tag,
          address: updatedTransientAddress,
          scalar: updatedTransientScalar,
          isOnChain: true,
          value: newBalance,
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
        return;
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
        return;
      }

      const { mintBurnTradingBtc } =
        twilightproject.nyks.zkos.MessageComposer.withTypeUrl;

      const mintBurnMsg = mintBurnTradingBtc({
        btcValue: Long.fromNumber(newBalance),
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

      addTransactionHistory({
        date: new Date(),
        from: selectedZkAccount.address,
        fromTag: selectedZkAccount.tag,
        to: twilightAddress,
        toTag: "Funding",
        tx_hash: mintBurnRes.transactionHash,
        type: "Burn",
        value: newBalance
      });

      toast({
        title: "Success",
        description: (
          <div className="opacity-90">
            {`Successfully sent ${new BTC("sats", Big(newBalance))
              .convert("BTC")
              .toString()} BTC to the Funding Account.`}
            <Link
              href={`${process.env.NEXT_PUBLIC_EXPLORER_URL as string}/tx/${mintBurnRes.transactionHash}`}
              target={"_blank"}
              className="text-sm underline hover:opacity-100"
            >
              Explorer link
            </Link>
          </div>
        ),
      });

      removeZkAccount(selectedZkAccount);
      return

    } catch (err) {
      setIsSettleLoading(false);
      setSettlingOrderId(null);
      console.error(err);
      toast({
        variant: "error",
        title: "Error",
        description: "An error has occurred withdrawing lend order, try again later.",
      });
    }
  }

  function renderTableContent() {
    switch (currentTab) {
      case "active-orders":
        return (
          <LendOrdersTable
            data={activeLendOrders}
            getCurrentPrice={getCurrentPrice}
            getPoolSharePrice={getPoolSharePrice}
            settleLendOrder={settleLendOrder}
            settlingOrderId={settlingOrderId}
          />
        );
      case "lend-history":
        return (
          <LendHistoryTable
            data={lendHistory}
            getCurrentPrice={getCurrentPrice}
          />
        );
    }
  }

  return (
    <div className="mx-8 my-8 space-y-6 md:space-y-8">
      {/* Pool Info */}
      <div className="rounded-lg bg-card border border-outline p-4 md:p-6">
        <Text heading="h2" className="mb-4 text-lg font-medium">
          Pool Info
        </Text>
        <PoolInfo />
      </div>

      {/* APY Chart and Add Liquidity */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* APY Chart */}
        <div className="rounded-lg bg-card border border-outline p-4 md:p-6">
          <Text heading="h2" className="mb-4 text-lg font-medium">
            APY History
          </Text>
          <ApyChart />
        </div>

        <div className="rounded-lg bg-card border border-outline p-4 md:p-6">
          <Text heading="h2" className="mb-4 text-lg font-medium">
            Add Liquidity
          </Text>
          <div className="space-y-4">
            <LendManagement />
            <div className="text-sm text-primary-accent">
              <p>Deposit BTC to earn yield from trading fees and lending rewards.</p>
            </div>
          </div>
        </div>
      </div>

      {/* My Investment */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-lg bg-card border border-outline p-4 md:p-6">
          <MyInvestment />
        </div>
      </div>

      <Separator />

      {/* Active Orders / Lend History */}
      <div className="space-y-4">
        <div className="flex w-full items-center border-b">
          <Tabs defaultValue={currentTab}>
            <TabsList className="flex w-full border-b-0" variant="underline">
              <TabsTrigger
                onClick={() => setCurrentTab("active-orders")}
                value="active-orders"
                variant="underline"
              >
                Deposits
              </TabsTrigger>
              <TabsTrigger
                onClick={() => setCurrentTab("lend-history")}
                value="lend-history"
                variant="underline"
              >
                History
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="overflow-x-auto">
          {renderTableContent()}
        </div>
      </div>
    </div>
  );
};

export default Page;
