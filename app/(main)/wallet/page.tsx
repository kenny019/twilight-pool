"use client";
import TransferDialog from "@/app/_components/wallet/transfer-dialog.client";
import Button from "@/components/button";
import Resource from "@/components/resource";
import { Separator } from "@/components/seperator";
import Skeleton from "@/components/skeleton";
import { Text } from "@/components/typography";
import { ZK_ACCOUNT_INDEX } from "@/lib/constants";
import useGetTwilightBTCBalance from "@/lib/hooks/useGetTwilightBtcBalance";
import { usePriceFeed } from "@/lib/providers/feed";
import { useSessionStore } from "@/lib/providers/session";
import { useTwilightStore, twilightStoreContext } from "@/lib/providers/store";
import BTC from "@/lib/twilight/denoms";
import { ZkAccount } from "@/lib/types";
import Big from "big.js";
import { ArrowLeftRight } from "lucide-react";
import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { TransactionHistoryDataTable } from "./transaction-history/data-table";
import { transactionHistoryColumns } from "./transaction-history/columns";
import { WalletStatus } from "@cosmos-kit/core";
import { useWallet } from "@cosmos-kit/react-lite";
import useIsMounted from "@/lib/hooks/useIsMounted";
import { useToast } from "@/lib/hooks/useToast";
import { Tabs, TabsList, TabsTrigger } from "@/components/tabs";
import { AccountSummaryDataTable } from "./account-summary/data-table";
import { accountSummaryColumns } from "./account-summary/columns";
import { createZkAccount, createZkBurnTx } from "@/lib/twilight/zk";
import { ZkPrivateAccount } from "@/lib/zk/account";
import { verifyAccount, verifyQuisQuisTransaction } from "@/lib/twilight/zkos";
import { broadcastTradingTx } from "@/lib/api/zkos";
import { safeJSONParse, isUserRejection } from "@/lib/helpers";
import { cosmos, twilightproject } from "twilightjs";
import Long from "long";
import Link from "next/link";
import FundingTradeButton from "@/components/fund-trade-button";
import useGetNyksBalance from "@/lib/hooks/useGetNyksBalance";
import dayjs from "dayjs";
import { calculateUpnl } from "@/app/_components/trade/orderbook/my-trades/columns";

type TabType = "account-summary" | "transaction-history";

export type ActiveAccount = {
  address: string;
  tag: string;
  createdAt: number;
  value: number;
  type: "Lend" | "Trade" | "Account";
  utilized: boolean;
  txHash: string;
};

const Page = () => {
  const [currentTab, setCurrentTab] = useState<TabType>("account-summary");
  const { toast } = useToast();

  const twilightStore = useContext(twilightStoreContext);
  const privateKey = useSessionStore((state) => state.privateKey);
  const btcPrice = useSessionStore((state) => state.price.btcPrice);
  const zkAccounts = useTwilightStore((state) => state.zk.zkAccounts);

  const trades = useTwilightStore((state) => state.trade.trades);
  const tradeHistory = useTwilightStore((state) => state.trade_history.trades);
  const lends = useTwilightStore((state) => state.lend.lends);
  const lendHistory = useTwilightStore((state) => state.lend.lendHistory);
  const poolInfo = useTwilightStore((state) => state.lend.poolInfo);

  const activeAccounts = useMemo(() => {
    return zkAccounts.reduce<ActiveAccount[]>((acc, account) => {
      const trade = trades.find(
        (trade) => trade.accountAddress === account.address
      );
      const lend = lends.find(
        (lend) => lend.accountAddress === account.address
      );

      const type =
        account.tag === "main"
          ? "Trade"
          : trade
            ? "Trade"
            : lend
              ? "Lend"
              : "Account";

      const utilized = account.type === "Memo" ? true : false;
      const txHash = trade?.tx_hash || lend?.tx_hash || "";

      acc.push({
        address: account.address,
        tag: account.tag === "main" ? "Trading Account" : account.tag,
        createdAt: account.createdAt || dayjs().unix(),
        value: account.value || 0,
        type,
        utilized,
        txHash,
      });

      return acc;
    }, [] as ActiveAccount[]);
  }, [zkAccounts, trades, lends]);

  const transactionHistory = useTwilightStore(
    (state) => state.history.transactions
  );

  const { getCurrentPrice } = usePriceFeed();

  const finalPrice = getCurrentPrice() || btcPrice;

  const { twilightSats, isLoading: satsLoading } = useGetTwilightBTCBalance();

  const { nyksBalance, isLoading: nyksLoading } = useGetNyksBalance();

  const { mainWallet } = useWallet();

  const twilightAddress = mainWallet?.getChainWallet("nyks")?.address || "";

  const twilightBTCBalanceString = new BTC("sats", Big(twilightSats))
    .convert("BTC")
    .toFixed(8);

  const twilightBalanceUSDString = Big(twilightBTCBalanceString)
    .mul(finalPrice)
    .toFixed(2);

  const tradingAccount = zkAccounts.find((account) => account.tag === "main");

  const tradingAccountBalance = tradingAccount?.value || 0;

  const tradingAccountBTCString = new BTC("sats", Big(tradingAccountBalance))
    .convert("BTC")
    .toFixed(8);

  const tradingAccountBTCUSDString = Big(tradingAccountBTCString)
    .mul(finalPrice)
    .toFixed(2);

  const zkAccountSatsBalance = zkAccounts
    .filter((account) => account.tag !== "main" && account.type === "Memo")
    .reduce((acc, account) => acc + (account.value || 0), 0);

  const zkAccountBTCString = new BTC("sats", Big(zkAccountSatsBalance))
    .convert("BTC")
    .toFixed(8);

  const zkAccountBTCUSDString = Big(zkAccountBTCString)
    .mul(finalPrice)
    .toFixed(2);

  const lendingAccountBalance = lends.reduce(
    (acc, lend) => acc + (lend.value || 0),
    0
  );

  const lendingAccountBTCString = new BTC("sats", Big(lendingAccountBalance))
    .convert("BTC")
    .toFixed(8);

  const lendingAccountBTCUSDString = Big(lendingAccountBTCString)
    .mul(finalPrice)
    .toFixed(2);

  // Filter active trades by zkAccount type === "Memo" (utilized in open position)
  const activeTrades = useMemo(() => {
    const memoAccountAddresses = new Set(
      zkAccounts.filter((acc) => acc.type === "Memo").map((acc) => acc.address)
    );
    return trades.filter((t) => memoAccountAddresses.has(t.accountAddress));
  }, [trades, zkAccounts]);

  const totalPnl = useMemo(() => {
    return activeTrades.reduce((acc, trade) => {
      return (
        acc +
        calculateUpnl(
          trade.entryPrice,
          finalPrice,
          trade.positionType,
          trade.positionSize
        )
      );
    }, 0);
  }, [activeTrades, finalPrice]);

  const totalVolume = useMemo(() => {
    const seen = new Set<string>();
    let total = 0;
    for (const trade of [...trades, ...tradeHistory]) {
      if (seen.has(trade.uuid)) continue;
      seen.add(trade.uuid);
      total += trade.initialMargin * trade.leverage;
    }
    return total;
  }, [trades, tradeHistory]);

  // Filter active lends only
  const activeLends = useMemo(
    () => lends.filter((l) => l.orderStatus === "LENDED"),
    [lends]
  );

  const poolSharePrice = poolInfo?.pool_share || 0;

  const lendUnrealizedRewards = useMemo(() => {
    if (!poolSharePrice) return 0;
    return activeLends.reduce((acc, lend) => {
      const shares = lend.npoolshare || 0;
      const rewards = poolSharePrice * (shares / 10000) - lend.value;
      return acc + Math.max(0, rewards);
    }, 0);
  }, [activeLends, poolSharePrice]);

  const lendPnl = useMemo(() => {
    return lendHistory.reduce((acc, order) => acc + (order.payment || 0), 0);
  }, [lendHistory]);

  const pnlColor = (val: number) =>
    val > 0 ? "text-green-medium" : val < 0 ? "text-red" : "";

  const totalPnlBTC = new BTC("sats", Big(totalPnl)).convert("BTC").toFixed(8);
  const totalVolumeBTC = new BTC("sats", Big(totalVolume))
    .convert("BTC")
    .toFixed(8);
  const lendUnrealizedRewardsBTC = new BTC("sats", Big(lendUnrealizedRewards))
    .convert("BTC")
    .toFixed(8);
  const lendPnlBTC = new BTC("sats", Big(lendPnl)).convert("BTC").toFixed(8);

  const totalSatsBalance = Big(twilightSats).plus(zkAccountSatsBalance || 0);

  const totalBTCBalanceString = new BTC("sats", totalSatsBalance)
    .convert("BTC")
    .toFixed(8);

  const totalBalanceUSDString = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Big(totalBTCBalanceString).mul(finalPrice).toNumber());

  const chainWallet = mainWallet?.getChainWallet("nyks");

  const addTransactionHistory = useTwilightStore(
    (state) => state.history.addTransaction
  );

  const removeZkAccount = useTwilightStore((state) => state.zk.removeZkAccount);

  const subaccountTransfer = useCallback(
    async (address: string) => {
      const zkAccount = zkAccounts.find((a) => a.address === address);
      if (!zkAccount) {
        toast({ variant: "error", title: "Account not found" });
        return;
      }
      if (!twilightAddress || !chainWallet) {
        toast({ variant: "error", title: "Please connect your wallet" });
        return;
      }
      if (!zkAccount.value) {
        toast({ variant: "error", title: "Account has zero balance" });
        return;
      }
      if (!privateKey) {
        toast({ variant: "error", title: "Session key missing" });
        return;
      }

      let cosmosScalar = "";
      let cosmosAccountHex = "";

      try {
        if (zkAccount.isOnChain) {
          const transientZkAccount = await createZkAccount({
            tag: Math.random().toString(36).substring(2, 15),
            signature: privateKey,
          });

          const senderZkPrivateAccount = await ZkPrivateAccount.create({
            signature: privateKey,
            existingAccount: zkAccount,
          });

          console.log("account from", zkAccount);

          const privateTxSingleResult =
            await senderZkPrivateAccount.privateTxSingle(
              zkAccount.value,
              transientZkAccount.address
            );

          console.log("privateTxSingleResult", privateTxSingleResult);
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

          console.log("txId", txId, "updatedAddess", updatedTransientAddress);

          console.log("transient zkAccount balance =", zkAccount.value);

          const {
            success,
            msg: zkBurnMsg,
            zkAccountHex,
          } = await createZkBurnTx({
            signature: privateKey,
            zkAccount: {
              tag: zkAccount.tag,
              address: updatedTransientAddress,
              scalar: updatedTransientScalar,
              isOnChain: true,
              value: zkAccount.value,
              type: "Coin",
            },
            initZkAccountAddress: transientZkAccount.address,
          });

          if (!success || !zkBurnMsg || !zkAccountHex) {
            return {
              success: false,
              message: "Error creating zkBurnTx msg",
            };
          }

          console.log({
            zkAccountHex: zkAccountHex,
            balance: zkAccount.value,
            signature: privateKey,
            initZkAccountAddress: transientZkAccount.address,
          });

          toast({
            title: "Broadcasting transfer",
            description:
              "Please do not close this page while your BTC is being transferred to your funding account...",
          });

          const txValidMessage = await verifyQuisQuisTransaction({
            tx: zkBurnMsg,
          });

          console.log("txValidMessage", txValidMessage);

          const tradingTxResString = await broadcastTradingTx(
            zkBurnMsg,
            twilightAddress
          );

          (console.log("zkBurnMsg tradingTxResString >>"), tradingTxResString);

          const tradingTxRes = safeJSONParse(tradingTxResString as string);

          if (!tradingTxRes.success || Object.hasOwn(tradingTxRes, "error")) {
            toast({
              variant: "error",
              title: "An error has occurred",
              description: "Please try again later.",
            });
            console.error("error broadcasting zkBurnTx msg", tradingTxRes);
            return {
              success: false,
              message: "Error broadcasting zkBurnTx msg",
            };
          }

          console.log("tradingTxRes", tradingTxRes);
          cosmosScalar = updatedTransientScalar;
          cosmosAccountHex = zkAccountHex;
        } else {
          if (!zkAccount.zkAccountHex) {
            console.error("zkAccountHex is undefined cant proceed");
            throw new Error("zkAccountHex is undefined cant proceed");
          }
          cosmosAccountHex = zkAccount.zkAccountHex;
          cosmosScalar = zkAccount.scalar;
        }

        const { mintBurnTradingBtc } =
          twilightproject.nyks.zkos.MessageComposer.withTypeUrl;

        const stargateClient = await chainWallet.getSigningStargateClient();

        console.log({
          btcValue: Long.fromNumber(zkAccount.value),
          encryptScalar: cosmosScalar,
          mintOrBurn: false,
          qqAccount: cosmosAccountHex,
          twilightAddress,
        });

        const mintBurnMsg = mintBurnTradingBtc({
          btcValue: Long.fromNumber(zkAccount.value),
          encryptScalar: cosmosScalar,
          mintOrBurn: false,
          qqAccount: cosmosAccountHex,
          twilightAddress,
        });

        console.log("mintBurnMsg", mintBurnMsg);

        const mintBurnRes = await stargateClient.signAndBroadcast(
          twilightAddress,
          [mintBurnMsg],
          "auto"
        );

        addTransactionHistory({
          date: new Date(),
          from: zkAccount.address,
          fromTag: zkAccount.tag,
          to: twilightAddress,
          toTag: "Funding",
          tx_hash: mintBurnRes.transactionHash,
          type: "Burn",
          value: zkAccount.value,
        });

        removeZkAccount(zkAccount);

        toast({
          title: "Success",
          description: (
            <div className="opacity-90">
              {`Successfully sent ${new BTC("sats", Big(zkAccount.value))
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
      } catch (err) {
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
          title: "An error has occurred",
          description: "Please try again later.",
        });
      }
    },
    [
      toast,
      privateKey,
      twilightAddress,
      removeZkAccount,
      addTransactionHistory,
      chainWallet,
      zkAccounts,
    ]
  );

  const exportData = useCallback(() => {
    if (!twilightAddress) {
      toast({
        title: "Export failed",
        description: "Please connect your wallet first.",
      });
      return;
    }

    if (!twilightStore) {
      toast({
        title: "Export failed",
        description: "Store not available",
      });
      return;
    }

    const storeState = twilightStore.getState();
    const jsonString = JSON.stringify(storeState);

    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${twilightAddress}-data.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Exported successfully",
      description: "Exported account data to your device.",
    });
  }, [twilightStore, toast, twilightAddress]);

  const importData = useCallback(() => {
    if (!twilightAddress) {
      toast({
        title: "Import failed",
        description: "Please connect your wallet first.",
      });
      return;
    }

    if (!twilightStore) {
      toast({
        title: "Import failed",
        description: "Store not available",
      });
      return;
    }

    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const data = JSON.parse(text);
        twilightStore.setState(data);
        toast({
          title: "Imported successfully",
          description: "Account data has been imported.",
        });
      } catch (error) {
        toast({
          title: "Import failed",
          description: "Invalid JSON file.",
        });
      }
    };
    input.click();
  }, [twilightStore, toast, twilightAddress]);

  function renderTableContent() {
    switch (currentTab) {
      case "account-summary":
        return (
          <div>
            <AccountSummaryDataTable
              columns={accountSummaryColumns}
              data={activeAccounts}
              subaccountTransfer={subaccountTransfer}
            />
          </div>
        );
      case "transaction-history":
        return (
          <TransactionHistoryDataTable
            columns={transactionHistoryColumns}
            data={transactionHistory}
          />
        );
    }
  }

  return (
    <div className="mx-4 mt-4 space-y-4 md:mx-8 md:space-y-8">
      <div className="flex flex-col space-y-4 md:grid md:grid-cols-12 md:gap-4 md:space-y-0">
        <div className="rounded-md border p-4 md:col-span-4 md:space-y-4 md:p-4">
          <div className="space-y-1">
            <Text heading="h1" className="mb-0 text-lg font-normal">
              Asset Overview
            </Text>
            <div>
              <Resource
                isLoaded={!satsLoading}
                placeholder={<Skeleton className="h-10 w-[200px]" />}
              >
                <Text className="text-sm md:text-4xl">
                  {totalBTCBalanceString}
                  <span className="ml-0 inline-flex text-sm md:ml-1">BTC</span>
                </Text>
              </Resource>

              <Text className="text-xs text-primary-accent">
                = {totalBalanceUSDString} USD
              </Text>
            </div>
          </div>

          <div className="space-y-1">
            <Text className="text-sm">Twilight Address</Text>
            <Text
              onClick={(e) => {
                if (!twilightAddress) return;
                e.preventDefault();
                toast({
                  title: "Copied to clipboard",
                  description: "Copied your twilight address to the clipboard",
                });
                navigator.clipboard.writeText(twilightAddress);
              }}
              className="cursor-pointer text-xs text-primary-accent"
            >
              {twilightAddress}
            </Text>
          </div>
          <div className="space-y-1">
            <Text className="text-sm">NYKS Balance</Text>
            <Resource
              isLoaded={!nyksLoading}
              placeholder={<Skeleton className="h-4 w-[80px]" />}
            >
              <Text className="text-xs text-primary-accent">
                {Intl.NumberFormat("en-US", {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 8,
                }).format(nyksBalance / 1e8)}{" "}
                NYKS
              </Text>
            </Resource>
          </div>
        </div>
        <div className="space-y-4 rounded-md border p-4 md:col-span-3 md:p-4">
          <Text heading="h2" className="text-sm text-primary-accent">
            Trades
          </Text>

          <div className="flex justify-between">
            <Text className="text-xs text-primary-accent">PNL</Text>
            <Resource
              isLoaded={!satsLoading}
              placeholder={<Skeleton className="h-4 w-[80px]" />}
            >
              <Text className={`text-xs ${pnlColor(totalPnl)}`}>
                {totalPnl > 0 ? "+" : ""}
                {totalPnlBTC} BTC
              </Text>
            </Resource>
          </div>

          <div className="flex justify-between">
            <Text className="text-xs text-primary-accent">Volume</Text>
            <Resource
              isLoaded={!satsLoading}
              placeholder={<Skeleton className="h-4 w-[80px]" />}
            >
              <Text className="text-xs">{totalVolumeBTC} BTC</Text>
            </Resource>
          </div>

          <Separator />

          <Text heading="h2" className="text-sm text-primary-accent">
            Lend
          </Text>

          <div className="flex justify-between">
            <Text className="text-xs text-primary-accent">Lend U. Rewards</Text>
            <Resource
              isLoaded={!satsLoading}
              placeholder={<Skeleton className="h-4 w-[80px]" />}
            >
              <Text className="text-xs">{lendUnrealizedRewardsBTC} BTC</Text>
            </Resource>
          </div>

          <div className="flex justify-between">
            <Text className="text-xs text-primary-accent">Lend PnL</Text>
            <Resource
              isLoaded={!satsLoading}
              placeholder={<Skeleton className="h-4 w-[80px]" />}
            >
              <Text className={`text-xs ${pnlColor(lendPnl)}`}>
                {lendPnl > 0 ? "+" : ""}
                {lendPnlBTC} BTC
              </Text>
            </Resource>
          </div>
        </div>
        <div className="flex flex-col rounded-md border p-4 md:col-span-5 md:p-4">
          <Text heading="h2" className="text-sm text-primary-accent">
            My Accounts
          </Text>
          <div className="space-y-4">
            <div className="grid w-full grid-cols-3">
              <Text className="text-sm md:text-base">Funding</Text>
              <div className="mx-auto">
                <Resource
                  isLoaded={!satsLoading}
                  placeholder={<Skeleton className="h-5 w-[140px]" />}
                >
                  <Text className="text-sm text-primary/80 md:text-base">
                    {twilightBTCBalanceString} BTC
                  </Text>
                </Resource>
                <Resource
                  isLoaded={!satsLoading}
                  placeholder={<Skeleton className="mt-1 h-4 w-[80px]" />}
                >
                  <Text className="text-xs text-primary-accent">
                    = {twilightBalanceUSDString} USD
                  </Text>
                </Resource>
              </div>
              <div className="flex flex-row justify-end space-x-2">
                <FundingTradeButton type="icon" defaultTransferType="fund" />
              </div>
            </div>

            <Separator />

            <div className="grid w-full grid-cols-3">
              <Text className="text-sm md:text-base">Trading</Text>
              <div className="mx-auto">
                <Resource
                  isLoaded={!satsLoading}
                  placeholder={<Skeleton className="h-5 w-[140px]" />}
                >
                  <Text className="text-sm text-primary/80 md:text-base">
                    {tradingAccountBTCString} BTC
                  </Text>
                </Resource>
                <Resource
                  isLoaded={!satsLoading}
                  placeholder={<Skeleton className="mt-1 h-4 w-[80px]" />}
                >
                  <Text className="text-xs text-primary-accent">
                    = {tradingAccountBTCUSDString} USD
                  </Text>
                </Resource>
              </div>
              <div className="flex flex-row justify-end space-x-2">
                <FundingTradeButton type="icon" defaultTransferType="trade" />
              </div>
            </div>

            <Separator />

            <div className="grid w-full grid-cols-3">
              <Text className="text-sm md:text-base">Lending</Text>
              <div className="mx-auto">
                <Resource
                  isLoaded={!satsLoading}
                  placeholder={<Skeleton className="h-5 w-[140px]" />}
                >
                  <Text className="text-sm text-primary/80 md:text-base">
                    {lendingAccountBTCString} BTC
                  </Text>
                </Resource>
                <Resource
                  isLoaded={!satsLoading}
                  placeholder={<Skeleton className="mt-1 h-4 w-[80px]" />}
                >
                  <Text className="text-xs text-primary-accent">
                    = {lendingAccountBTCUSDString} USD
                  </Text>
                </Resource>
              </div>
              <div className="flex flex-row justify-end space-x-2"></div>
            </div>

            <Separator />

            <div className="grid w-full grid-cols-3">
              <Text className="col-span-1 text-sm md:text-base">Utilized</Text>
              <div className="col-span-1 mx-auto">
                <Resource
                  isLoaded={!satsLoading}
                  placeholder={<Skeleton className="h-5 w-[140px]" />}
                >
                  <Text className="text-sm text-primary/80 md:text-base">
                    {zkAccountBTCString} BTC
                  </Text>
                </Resource>
                <Resource
                  isLoaded={!satsLoading}
                  placeholder={<Skeleton className="mt-1 h-4 w-[80px]" />}
                >
                  <Text className="text-xs text-primary-accent">
                    = {zkAccountBTCUSDString} USD
                  </Text>
                </Resource>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="space-y-1 rounded-md border p-4 md:space-y-2 md:p-6">
        <div className="flex w-full justify-between border-b">
          <Tabs defaultValue={currentTab}>
            <TabsList className="flex w-full border-b-0" variant="underline">
              <TabsTrigger
                onClick={() => setCurrentTab("account-summary")}
                value="account-summary"
                variant="underline"
              >
                Active Accounts
              </TabsTrigger>
              <TabsTrigger
                onClick={() => setCurrentTab("transaction-history")}
                value="transaction-history"
                variant="underline"
              >
                Transaction History
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex space-x-2">
            <button onClick={importData} className="text-xs">
              Import
            </button>
            <button onClick={exportData} className="text-xs">
              Export
            </button>
          </div>
        </div>

        <div className="h-full min-h-[500px] w-full overflow-auto py-1">
          {renderTableContent()}
        </div>
      </div>
    </div>
  );
};

export default Page;
