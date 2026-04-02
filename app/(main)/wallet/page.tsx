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
import { useTwilightStore } from "@/lib/providers/store";
import BTC from "@/lib/twilight/denoms";
import { ZkAccount } from "@/lib/types";
import Big from "big.js";
import { ArrowLeftRight } from "lucide-react";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
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
import { AccountLedgerDataTable } from "./account-ledger/data-table";
import { accountLedgerColumns } from "./account-ledger/columns";
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
import { POOL_SHARE_DECIMALS_SCALE } from "@/lib/format/poolShares";
import { Tooltip } from "@/components/tooltip";
import { assertCosmosTxSuccess } from "@/lib/utils/cosmosTx";

type TabType = "account-summary" | "transaction-history" | "account-ledger";

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
  const privateKey = useSessionStore((state) => state.privateKey);
  const btcPrice = useSessionStore((state) => state.price.btcPrice);
  const zkAccounts = useTwilightStore((state) => state.zk.zkAccounts);

  const trades = useTwilightStore((state) => state.trade.trades);
  const tradeHistory = useTwilightStore((state) => state.trade_history.trades);
  const lends = useTwilightStore((state) => state.lend.lends);
  const lendHistory = useTwilightStore((state) => state.lend.lendHistory);
  const poolInfo = useTwilightStore((state) => state.lend.poolInfo);

  const activeAccounts = useMemo(() => {
    const tradesByAddress = new Map(trades.map((t) => [t.accountAddress, t]));
    const lendsByAddress = new Map(lends.map((l) => [l.accountAddress, l]));

    return zkAccounts.reduce<ActiveAccount[]>((acc, account) => {
      const trade = tradesByAddress.get(account.address);
      const lend = lendsByAddress.get(account.address);

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
        tag: account.tag === "main" ? "Primary Trading Account" : account.tag,
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
  const accountLedgerEntries = useTwilightStore(
    (state) => state.account_ledger.entries
  );

  const { getCurrentPrice, subscribe } = usePriceFeed();
  const liveBtcPrice = useSyncExternalStore(
    subscribe,
    getCurrentPrice,
    () => 0
  );
  const finalPrice = liveBtcPrice || btcPrice;

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

  /** Non-main Memo accounts (margin / utilized in open positions). */
  const zkAccountSatsBalance = zkAccounts
    .filter((account) => account.tag !== "main" && account.type === "Memo")
    .reduce((acc, account) => acc + (account.value || 0), 0);

  /** All ZK balances: main, subaccounts, lend collateral, etc. (exclusive of on-chain funding). */
  const totalZkSatsBalance = zkAccounts.reduce(
    (acc, account) => acc + (account.value || 0),
    0
  );

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
      const rewards = poolSharePrice * (shares / POOL_SHARE_DECIMALS_SCALE) - lend.value;
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

  // Total assets = NYKS funding (on-chain sats) + every ZK account balance.
  // Lend deposits and trading margin are already included in zkAccounts; do not add lends again.
  const totalSatsBalance = Big(twilightSats).plus(totalZkSatsBalance || 0);

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

        const mintBurnRes = assertCosmosTxSuccess(
          await stargateClient.signAndBroadcast(
            twilightAddress,
            [mintBurnMsg],
            "auto"
          ),
          "Subaccount to funding burn"
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
          funding_sats_snapshot: twilightSats,
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
      twilightSats,
      removeZkAccount,
      addTransactionHistory,
      chainWallet,
      zkAccounts,
    ]
  );

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
      case "account-ledger":
        return (
          <AccountLedgerDataTable
            columns={accountLedgerColumns}
            data={accountLedgerEntries}
          />
        );
    }
  }

  return (
    <div className="mx-4 mt-4 space-y-4 md:mx-8 md:space-y-8">
      <div className="flex flex-col space-y-4 md:grid md:grid-cols-12 md:gap-4 md:space-y-0">
        <div className="bg-card flex flex-col gap-6 rounded-lg border border-outline p-4 md:col-span-4 md:p-6">
          <div className="space-y-3">
            <Text
              heading="h2"
              className="text-sm font-medium text-primary-accent"
            >
              Asset Overview
            </Text>
            <div className="space-y-2">
              <Resource
                isLoaded={!satsLoading}
                placeholder={<Skeleton className="h-10 w-[200px]" />}
              >
                <Text className="text-xl font-semibold tabular-nums tracking-tight sm:text-2xl md:text-4xl">
                  {totalBTCBalanceString}
                  <span className="ml-1 inline text-base font-medium text-primary-accent sm:text-lg md:ml-2 md:text-2xl">
                    BTC
                  </span>
                </Text>
              </Resource>

              <Text className="text-sm tabular-nums text-primary-accent">
                ≈ {totalBalanceUSDString} USD
              </Text>
              <Text className="text-xs leading-relaxed text-primary-accent/90">
                On-chain funding plus zero knowledge account balances.
              </Text>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Text className="text-xs text-primary-accent">
              Twilight address
            </Text>
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
              className="cursor-pointer break-all text-sm text-primary-accent underline-offset-2 hover:underline"
            >
              {twilightAddress}
            </Text>
          </div>

          <Separator />

          <div className="space-y-2">
            <Text className="text-xs text-primary-accent">
              Network fee balance (NYKS)
            </Text>
            <Resource
              isLoaded={!nyksLoading}
              placeholder={<Skeleton className="h-4 w-[80px]" />}
            >
              <Text className="text-sm tabular-nums text-primary-accent">
                {Intl.NumberFormat("en-US", {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 8,
                }).format(nyksBalance)}
              </Text>
            </Resource>
          </div>
        </div>
        <div className="bg-card flex flex-col gap-6 rounded-lg border border-outline p-4 md:col-span-3 md:p-6">
          <div className="space-y-4">
            <Text
              heading="h2"
              className="text-sm font-medium text-primary-accent"
            >
              Trades
            </Text>

            <div className="flex justify-between gap-4">
              <Text className="text-xs text-primary-accent">Trade PnL</Text>
              <Resource
                isLoaded={!satsLoading}
                placeholder={<Skeleton className="h-4 w-[80px]" />}
              >
                <Text className={`text-xs tabular-nums ${pnlColor(totalPnl)}`}>
                  {totalPnl > 0 ? "+" : ""}
                  {totalPnlBTC} BTC
                </Text>
              </Resource>
            </div>

            <div className="flex justify-between gap-4">
              <Text className="text-xs text-primary-accent">Volume</Text>
              <Resource
                isLoaded={!satsLoading}
                placeholder={<Skeleton className="h-4 w-[80px]" />}
              >
                <Text className="text-xs tabular-nums">
                  {totalVolumeBTC} BTC
                </Text>
              </Resource>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <Text
              heading="h2"
              className="text-sm font-medium text-primary-accent"
            >
              Lend
            </Text>

            <div className="flex justify-between gap-4">
              <Text className="text-xs text-primary-accent">Accrued Yield</Text>
              <Resource
                isLoaded={!satsLoading}
                placeholder={<Skeleton className="h-4 w-[80px]" />}
              >
                <Text className="text-xs tabular-nums">
                  {lendUnrealizedRewardsBTC} BTC
                </Text>
              </Resource>
            </div>

            <div className="flex justify-between gap-4">
              <Text className="text-xs text-primary-accent">Lend PnL</Text>
              <Resource
                isLoaded={!satsLoading}
                placeholder={<Skeleton className="h-4 w-[80px]" />}
              >
                <Text className={`text-xs tabular-nums ${pnlColor(lendPnl)}`}>
                  {lendPnl > 0 ? "+" : ""}
                  {lendPnlBTC} BTC
                </Text>
              </Resource>
            </div>
          </div>
        </div>
        <div className="bg-card flex flex-col rounded-lg border border-outline p-4 md:col-span-5 md:p-6">
          <Text
            heading="h2"
            className="text-sm font-medium text-primary-accent"
          >
            My Accounts
          </Text>
          <div className="mt-4 space-y-4">
            <div className="grid w-full grid-cols-1 sm:grid-cols-3 items-center gap-2">
              <div className="min-w-0">
                <Tooltip
                  title="Funding"
                  body="Base balance for deposits, withdrawals, and transfers to Trading or Lending."
                >
                  <span className="text-sm font-medium text-primary/80 md:text-base">
                    Funding
                  </span>
                </Tooltip>
              </div>
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
                    ≈ {twilightBalanceUSDString} USD
                  </Text>
                </Resource>
              </div>
              <div className="flex flex-row justify-end space-x-2">
                <FundingTradeButton type="icon" defaultTransferType="fund" />
              </div>
            </div>

            <Separator />

            <div className="grid w-full grid-cols-1 sm:grid-cols-3 items-center gap-2">
              <Text className="text-sm font-medium text-primary/80 md:text-base">
                Trading
              </Text>
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
                    ≈ {tradingAccountBTCUSDString} USD
                  </Text>
                </Resource>
              </div>
              <div className="flex flex-row justify-end space-x-2">
                <FundingTradeButton type="icon" defaultTransferType="trade" />
              </div>
            </div>

            <Separator />

            <div className="grid w-full grid-cols-1 sm:grid-cols-3 items-center gap-2">
              <Text className="text-sm font-medium text-primary/80 md:text-base">
                Lending
              </Text>
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
                    ≈ {lendingAccountBTCUSDString} USD
                  </Text>
                </Resource>
              </div>
              <div className="flex flex-row justify-end space-x-2"></div>
            </div>

            <Separator />

            <div className="grid w-full grid-cols-1 sm:grid-cols-3 items-center gap-2">
              <div className="min-w-0">
                <Tooltip
                  title="Allocated"
                  body="Funds currently used in trades and lending"
                >
                  <span className="text-sm font-medium text-primary/80 md:text-base">
                    Allocated
                  </span>
                </Tooltip>
              </div>
              <div className="mx-auto">
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
                    ≈ {zkAccountBTCUSDString} USD
                  </Text>
                </Resource>
              </div>
              <div />
            </div>
          </div>
        </div>
      </div>
      <div className="bg-card space-y-1 rounded-lg border border-outline p-4 md:space-y-2 md:p-6">
        <div className="flex w-full flex-col gap-2 border-b border-outline pb-2 md:flex-row md:items-center md:justify-between md:pb-0">
          <Tabs defaultValue={currentTab} className="min-w-0 w-full">
            <div className="w-full overflow-x-auto overflow-y-hidden overscroll-x-contain scrollbar-none touch-pan-x">
              <TabsList
                className="min-w-max flex-nowrap justify-start border-b-0 pr-3 max-md:space-x-3"
                variant="underline"
              >
              <TabsTrigger
                className="shrink-0 max-md:min-h-[36px] max-md:text-xs"
                onClick={() => setCurrentTab("account-summary")}
                value="account-summary"
                variant="underline"
              >
                <span className="md:hidden">Accounts</span>
                <span className="hidden md:inline">Active Accounts</span>
              </TabsTrigger>
              <TabsTrigger
                className="shrink-0 max-md:min-h-[36px] max-md:text-xs"
                onClick={() => setCurrentTab("transaction-history")}
                value="transaction-history"
                variant="underline"
              >
                <span className="md:hidden">Transactions</span>
                <span className="hidden md:inline">Transaction History</span>
              </TabsTrigger>
              <TabsTrigger
                className="shrink-0 max-md:min-h-[36px] max-md:text-xs"
                onClick={() => setCurrentTab("account-ledger")}
                value="account-ledger"
                variant="underline"
              >
                <span className="md:hidden">Ledger</span>
                <span className="hidden md:inline">Account Ledger</span>
              </TabsTrigger>
              </TabsList>
            </div>
          </Tabs>

        </div>

        <div className="h-full min-h-[400px] w-full overflow-visible py-1 md:overflow-auto">
          {renderTableContent()}
        </div>
      </div>
    </div>
  );
};

export default Page;
