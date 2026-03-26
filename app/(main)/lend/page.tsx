"use client";

import PoolInfo from "@/app/_components/lend/pool-info.client";
import PoolHealth from "@/app/_components/lend/pool-health.client";
import ApyChart from "@/app/_components/lend/apy-chart.client";
import MyInvestment from "@/app/_components/lend/my-investment.client";
import LendManagement from "@/app/_components/lend/lend-management.client";
import LendOrdersTable from "@/app/_components/trade/details/tables/lend-orders/lend-orders-table.client";
import LendHistoryTable from "@/app/_components/trade/details/tables/lend-history/lend-history-table.client";
import Button from "@/components/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/tabs";
import { Text } from "@/components/typography";
import { Separator } from "@/components/seperator";
import { executeLendOrder } from "@/lib/api/client";
import {
  queryTransactionHashByRequestId,
  queryTransactionHashes,
  type TransactionHash,
} from "@/lib/api/rest";
import { retry, safeJSONParse, isUserRejection } from "@/lib/helpers";
import useGetMarketStats from "@/lib/hooks/useGetMarketStats";
import useRedirectUnconnected from "@/lib/hooks/useRedirectUnconnected";
import { useToast } from "@/lib/hooks/useToast";
import { useSessionStore } from "@/lib/providers/session";
import { useTwilightStore } from "@/lib/providers/store";
import {
  createQueryLendOrderMsg,
  executeTradeLendOrderMsg,
} from "@/lib/twilight/zkos";
import { WalletStatus } from "@cosmos-kit/core";
import { useWallet } from "@cosmos-kit/react-lite";
import { Loader2 } from "lucide-react";
import React, { useState, useMemo, useCallback } from "react";
import { LendOrder, ZkAccount } from "@/lib/types";
import { useGetLendPoolInfo } from "@/lib/hooks/useGetLendPoolInfo";
import type { ApyPeriod } from "@/lib/hooks/useApyChartData";
import { queryLendOrder } from "@/lib/api/relayer";
import Big from "big.js";
import { usePriceFeed } from "@/lib/providers/feed";
import { createZkAccount, createZkBurnTx } from "@/lib/twilight/zk";
import { broadcastTradingTx } from "@/lib/api/zkos";
import { twilightproject } from "twilightjs";
import Long from "long";
import BTC from "@/lib/twilight/denoms";
import Link from "next/link";
import { ZkPrivateAccount } from "@/lib/zk/account";
import { assertCosmosTxSuccess } from "@/lib/utils/cosmosTx";
import {
  completeLendWithdrawal,
  markLendWithdrawalPending,
} from "@/lib/utils/lendWithdrawalState";

const formatTag = (tag: string) => {
  if (tag === "main") {
    return "Trading Account";
  }

  return tag;
};

type TabType = "active-orders" | "lend-history";

const Page = () => {
  useRedirectUnconnected();
  useGetLendPoolInfo();

  const { toast } = useToast();
  const marketStats = useGetMarketStats();
  const isRelayerHalted = marketStats.data?.status === "HALT";

  const [currentTab, setCurrentTab] = useState<TabType>("active-orders");
  const [selectedApyPeriod, setSelectedApyPeriod] = useState<ApyPeriod>("1W");
  const [isSettleLoading, setIsSettleLoading] = useState(false);
  const [settlingOrderId, setSettlingOrderId] = useState<string | null>(null);
  const [isWithdrawDialogOpen, setIsWithdrawDialogOpen] = useState(false);

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
  const updateLend = useTwilightStore((state) => state.lend.updateLend);
  const addTransactionHistory = useTwilightStore(
    (state) => state.history.addTransaction
  );

  const zkAccountTagMap = useMemo(
    () => new Map(zKAccounts.map((a) => [a.address, a.tag])),
    [zKAccounts]
  );

  const getAccountTag = useCallback(
    (address: string) => {
      return formatTag(zkAccountTagMap.get(address) || "");
    },
    [zkAccountTagMap]
  );

  // Filter lend orders for active vs history
  const activeLendOrders = useMemo(() => {
    return lendOrders
      .filter((order) => order.orderStatus === "LENDED")
      .map((order) => ({
        ...order,
        accountTag: getAccountTag(order.accountAddress),
      }));
  }, [lendOrders, getAccountTag]);

  const lendHistory = useMemo(() => {
    return lendHistoryData.map((order) => ({
      ...order,
      accountTag: getAccountTag(order.accountAddress),
    }));
  }, [lendHistoryData, getAccountTag]);

  const getPoolSharePrice = () => poolInfo?.pool_share || 0;

  const { mainWallet } = useWallet();
  const chainWallet = mainWallet?.getChainWallet("nyks");

  const twilightAddress = chainWallet?.address;

  async function settleLendOrder(order: LendOrder) {
    try {
      if (!chainWallet || !twilightAddress || !privateKey) {
        console.error("chainWallet not found");
        return;
      }

      if (isRelayerHalted) {
        toast({
          variant: "error",
          title: "Withdrawals paused",
          description:
            "The relayer is currently halted. Withdrawals will be available when the relayer resumes.",
        });
        return;
      }

      toast({
        title: "Withdrawing lend order",
        description:
          "Please do not close this page until the lend order is withdrawn...",
      });

      setIsSettleLoading(true);
      setSettlingOrderId(order.accountAddress); // Use accountAddress as unique identifier

      const lendOrderRes = await retry<
        ReturnType<typeof queryTransactionHashes>,
        string
      >(queryTransactionHashes, 30, order.accountAddress, 1000, (txHash) => {
        const found = txHash.result?.find((tx) => tx.order_status === "FILLED");
        return !!found;
      });

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
        outputMemo: lendOrderData.output ?? "",
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
        ReturnType<typeof queryTransactionHashByRequestId>,
        string
      >(
        queryTransactionHashByRequestId,
        30,
        requestId,
        1000,
        (txHash) => {
          const result = "result" in txHash ? txHash.result : undefined;
          const found = Array.isArray(result)
            ? result.find(
                (tx: TransactionHash) => tx.order_status === "SETTLED"
              )
            : undefined;
          return !!found;
        },
        (txHash) => {
          const result = "result" in txHash ? txHash.result : undefined;
          const cancelled = Array.isArray(result)
            ? result.find(
                (tx: TransactionHash) => tx.order_status === "CANCELLED"
              )
            : undefined;
          return !!cancelled;
        }
      );

      if (!requestIdRes.success) {
        if (requestIdRes.cancelled) {
          toast({
            variant: "error",
            title: "Withdraw request denied",
            description: "The withdraw request was denied. Please try again later.",
          });
        } else {
          console.error("lend order settle not successful");
          toast({
            variant: "error",
            title: "Unable to withdraw lend order",
            description: "An error has occurred, try again later.",
          });
        }
        setIsSettleLoading(false);
        setSettlingOrderId(null);
        return;
      }

      const txResult =
        "result" in requestIdRes.data ? requestIdRes.data.result : [];
      const requestIdData = Array.isArray(txResult)
        ? txResult.find((tx: TransactionHash) => tx.order_status === "SETTLED")
        : undefined;

      const tx_hash = requestIdData?.tx_hash;

      console.log("requestIdData", requestIdData);
      updateLend(order.uuid, markLendWithdrawalPending(order));

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

      const queryLendOrderRes = await retry(
        queryLendOrder,
        5,
        queryLendOrderMsg,
        1000,
        (res) => !!res?.result
      );

      if (!queryLendOrderRes.success || !queryLendOrderRes.data?.result) {
        console.error("queryLendOrder", queryLendOrderRes);
        toast({
          variant: "error",
          title: "Unable to query lend order",
          description:
            "Your withdraw may have succeeded. Check your transaction history.",
        });
        setIsSettleLoading(false);
        setSettlingOrderId(null);
        return;
      }

      const lendResult = queryLendOrderRes.data.result;
      const newBalance = Math.round(
        Big(lendResult.new_lend_state_amount ?? 0).toNumber()
      );

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

      addLendHistory(
        completeLendWithdrawal({
          order,
          txHash: tx_hash,
          value: newBalance,
          payment: Big(lendResult.payment ?? 0).toNumber() || 0,
        })
      );

      setIsSettleLoading(false);
      setSettlingOrderId(null);

      const updatedSelectedZkAccount: ZkAccount = {
        ...selectedZkAccount,
        type: "CoinSettled",
        value: newBalance,
      };

      updateZkAccount(selectedZkAccount.address, updatedSelectedZkAccount);

      setIsWithdrawDialogOpen(true);

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
          transientAccount.address
        );

      if (!privateTxSingleResult.success) {
        console.error(privateTxSingleResult.message);
        setIsWithdrawDialogOpen(false);
        return;
      }

      const {
        scalar: updatedTransientScalar,
        txId,
        updatedAddress: updatedTransientAddress,
      } = privateTxSingleResult.data;

      // update the account in case burn fails
      updateZkAccount(updatedSelectedZkAccount.address, {
        type: "Coin",
        address: updatedTransientAddress,
        scalar: updatedTransientScalar,
        isOnChain: true,
        value: newBalance,
        tag: updatedSelectedZkAccount.tag,
      });

      console.log(
        "updating account in case broadcast fails",
        updatedSelectedZkAccount.address,
        "updatedTransientAddress",
        updatedTransientAddress
      );

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
        setIsWithdrawDialogOpen(false);
        return;
      }

      // update the account in case broadcast fails
      updateZkAccount(updatedTransientAddress, {
        type: "Coin",
        address: updatedTransientAddress,
        scalar: updatedTransientScalar,
        isOnChain: false,
        value: newBalance,
        tag: updatedSelectedZkAccount.tag,
        zkAccountHex,
      });

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
        setIsWithdrawDialogOpen(false);
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
      });

      const mintBurnRes = assertCosmosTxSuccess(
        await stargateClient.signAndBroadcast(
          twilightAddress,
          [mintBurnMsg],
          "auto"
        ),
        "Lend withdrawal funding burn"
      );

      addTransactionHistory({
        date: new Date(),
        from: selectedZkAccount.address,
        fromTag: selectedZkAccount.tag,
        to: twilightAddress,
        toTag: "Funding",
        tx_hash: mintBurnRes.transactionHash,
        type: "Burn",
        value: newBalance,
      });

      toast({
        title: "Success",
        description: (
          <div className="opacity-90">
            {`Successfully sent ${new BTC("sats", Big(newBalance))
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

      setIsWithdrawDialogOpen(false);
      removeZkAccount({
        type: "Coin",
        address: updatedTransientAddress,
        scalar: updatedTransientScalar,
        isOnChain: false,
        value: newBalance,
        tag: updatedSelectedZkAccount.tag,
        zkAccountHex,
      });

      return;
    } catch (err) {
      setIsSettleLoading(false);
      setSettlingOrderId(null);
      setIsWithdrawDialogOpen(false);
      updateLend(order.uuid, { ...order, withdrawPending: false });
      if (isUserRejection(err)) {
        toast({
          title: "Transaction rejected",
          description: "You declined the transaction in your wallet.",
        });
        return;
      }
      console.error(err);
      toast({
        variant: "error",
        title: "Error",
        description:
          "An error has occurred withdrawing lend order, try again later.",
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
            isRelayerHalted={isRelayerHalted}
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
      <Dialog
        open={isWithdrawDialogOpen}
        onOpenChange={setIsWithdrawDialogOpen}
      >
        <DialogContent>
          <div className="flex flex-col items-center gap-4 py-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <DialogTitle>Withdrawal In Progress</DialogTitle>
            <DialogDescription className="text-center">
              A wallet signature is required to complete your withdrawal. Please
              approve the transaction when prompted.
            </DialogDescription>
          </div>
        </DialogContent>
      </Dialog>
      {/* Top section: Pool Performance + Pool Health | APY History */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Left column: stacked */}
        <div className="flex flex-col gap-6">
          <div className="bg-card rounded-lg border border-outline p-4 md:p-6">
            <Text heading="h2" className="mb-4 text-lg font-medium">
              Pool Performance
            </Text>
            <PoolInfo selectedApyPeriod={selectedApyPeriod} />
          </div>
          <div className="bg-card rounded-lg border border-outline p-4 md:p-6">
            <Text heading="h2" className="mb-4 text-lg font-medium">
              Pool Health
            </Text>
            <PoolHealth />
          </div>
        </div>
        {/* Right column: APY History (stretches to match left column height) */}
        <div className="bg-card flex flex-col rounded-lg border border-outline p-4 md:p-6">
          <Text heading="h2" className="mb-4 text-lg font-medium">
            APY History (fallback ={" "}
            {selectedApyPeriod === "1D"
              ? "1 Day"
              : selectedApyPeriod === "1W"
                ? "7 Days"
                : "30 Days"}
            )
          </Text>
          <div className="flex-1">
            <ApyChart
              selectedPeriod={selectedApyPeriod}
              onPeriodChange={setSelectedApyPeriod}
            />
          </div>
        </div>
      </div>

      {/* Bottom section: My Investment | Add Liquidity */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="bg-card rounded-lg border border-outline p-4 md:p-6">
          <MyInvestment />
        </div>
        <div className="bg-card rounded-lg border border-outline p-4 md:p-6">
          <Text heading="h2" className="mb-4 text-lg font-medium">
            Add Liquidity
          </Text>
          <div className="space-y-4">
            <LendManagement />
            <div className="text-sm text-primary-accent">
              <p>
                Deposit BTC to earn yield from trading fees and lending rewards.
              </p>
            </div>
          </div>
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

        <div className="overflow-x-auto">{renderTableContent()}</div>
      </div>
    </div>
  );
};

export default Page;
