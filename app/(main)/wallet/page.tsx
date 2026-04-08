"use client";
import TransferDialog from "@/app/_components/wallet/transfer-dialog.client";
import Button from "@/components/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/popover";
import Resource from "@/components/resource";
import { Separator } from "@/components/seperator";
import Skeleton from "@/components/skeleton";
import { Text } from "@/components/typography";
import { useSessionStore } from "@/lib/providers/session";
import { useTwilightStore } from "@/lib/providers/store";
import BTC from "@/lib/twilight/denoms";
import Big from "big.js";
import React, { useCallback, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { TransactionHistoryDataTable } from "./transaction-history/data-table";
import { transactionHistoryColumns } from "./transaction-history/columns";
import { useWallet } from "@cosmos-kit/react-lite";
import { useToast } from "@/lib/hooks/useToast";
import { Tabs, TabsList, TabsTrigger } from "@/components/tabs";
import { AccountSummaryDataTable } from "./account-summary/data-table";
import { accountSummaryColumns } from "./account-summary/columns";
import { AccountLedgerDataTable } from "./account-ledger/data-table";
import { accountLedgerColumns } from "./account-ledger/columns";
import { createZkAccount, createZkBurnTx } from "@/lib/twilight/zk";
import { ZkPrivateAccount } from "@/lib/zk/account";
import { verifyQuisQuisTransaction } from "@/lib/twilight/zkos";
import { broadcastTradingTx } from "@/lib/api/zkos";
import {
  formatSatsCompact,
  truncateHash,
  safeJSONParse,
  isUserRejection,
} from "@/lib/helpers";
import { twilightproject } from "twilightjs";
import Long from "long";
import Link from "next/link";
import { assertCosmosTxSuccess } from "@/lib/utils/cosmosTx";
import useWalletData from "./use-wallet-data";

type TabType = "wallet-activity" | "account-ledger";
export type { ActiveAccount } from "./use-wallet-data";

const Page = () => {
  const [currentTab, setCurrentTab] = useState<TabType>("wallet-activity");
  const { toast } = useToast();
  const privateKey = useSessionStore((state) => state.privateKey);
  const zkAccounts = useTwilightStore((state) => state.zk.zkAccounts);
  const {
    summary,
    allocation,
    pending,
    accounts,
    utility,
    activity,
  } = useWalletData();

  const { mainWallet } = useWallet();
  const chainWallet = mainWallet?.getChainWallet("nyks");

  const { activeAccounts } = accounts;
  const { twilightAddress, nyksBalance, nyksLoading, fundingLoading: satsLoading } =
    utility;
  const { transactionHistory, accountLedgerEntries } = activity;
  const pendingCount = pending.items.length;

  const [expandedInline, setExpandedInline] = useState<Set<string>>(new Set());
  const [expandedPopover, setExpandedPopover] = useState<Set<string>>(new Set());

  const makeToggle =
    (setter: React.Dispatch<React.SetStateAction<Set<string>>>) =>
    (type: string) =>
      setter((prev) => {
        const next = new Set(prev);
        next.has(type) ? next.delete(type) : next.add(type);
        return next;
      });

  const usdFormatter = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const totalBalanceLabel = formatSatsCompact(summary.totalBalanceSats);
  const totalBalanceUSDString = usdFormatter.format(summary.totalBalanceUsd);

  const availableToTradeLabel = formatSatsCompact(summary.availableToTradeSats);
  const availableToTradeUSDString = usdFormatter.format(summary.availableToTradeUsd);

  const lockedCapitalLabel = formatSatsCompact(summary.lockedCapitalSats);
  const lockedCapitalUSDString = usdFormatter.format(summary.lockedCapitalUsd);

  const fundingBalanceLabel = formatSatsCompact(allocation.fundingSats);
  const fundingBalanceUSDString = usdFormatter.format(allocation.fundingUsd);

  const tradingBalanceLabel = formatSatsCompact(allocation.tradingSats);
  const tradingBalanceUSDString = usdFormatter.format(allocation.tradingUsd);

  const lendingBalanceLabel = formatSatsCompact(allocation.lendingMarkToValueSats);
  const lendingBalanceUSDString = usdFormatter.format(allocation.lendingMarkToValueUsd);

  // Visualization-only clamping: lending can be negative (mark-to-value),
  // but bar widths and percentage text must not go below zero.
  const lendingClampedSats = Math.max(allocation.lendingMarkToValueSats, 0);
  const vizTotal = allocation.fundingSats + allocation.tradingSats + lendingClampedSats;
  const fundingPctViz = vizTotal > 0 ? (allocation.fundingSats / vizTotal) * 100 : 0;
  const tradingPctViz = vizTotal > 0 ? (allocation.tradingSats / vizTotal) * 100 : 0;
  const lendingPctViz =
    lendingClampedSats > 0 && vizTotal > 0
      ? (lendingClampedSats / vizTotal) * 100
      : 0;

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
          funding_sats_snapshot: allocation.fundingSats,
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
      allocation.fundingSats,
      removeZkAccount,
      addTransactionHistory,
      chainWallet,
      zkAccounts,
    ]
  );

  function renderTableContent() {
    switch (currentTab) {
      case "wallet-activity":
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

  function renderPendingItems(
    expanded: Set<string>,
    toggle: (type: string) => void
  ) {
    return pending.items.map((item) => {
      const isExpanded = expanded.has(item.type);
      const hasDetails = !!item.details?.length;

      return (
        <div key={item.type} className="rounded-lg border border-outline/70 p-3">
          {/* Summary */}
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span
                  className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-yellow-500/80"
                  aria-hidden="true"
                />
                <Text className="text-sm font-medium text-primary">
                  {item.label}
                </Text>
              </div>
              <Text className="text-xs leading-relaxed text-primary-accent">
                {item.description}
              </Text>
            </div>
            {typeof item.count === "number" && (
              <Text className="shrink-0 text-xs tabular-nums text-primary-accent">
                {item.count}
              </Text>
            )}
          </div>

          {/* Expand toggle — only shown when details exist */}
          {hasDetails && (
            <>
              <button
                type="button"
                className="mt-2 flex min-h-[36px] items-center gap-1 text-xs text-primary-accent/60 transition-colors hover:text-primary-accent"
                onClick={() => toggle(item.type)}
              >
                {isExpanded ? (
                  <ChevronUp className="h-3 w-3" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
                {isExpanded ? "Hide details" : "Details"}
              </button>

              {isExpanded && (
                <div className="mt-1 space-y-2 rounded-lg bg-primary/[0.02] px-3 py-2.5">
                  {item.details!.map((d, idx) => (
                    <div key={idx}>
                      <span className="block text-[10px] uppercase tracking-wide text-primary-accent/60">
                        {d.label}
                      </span>
                      {d.mono ? (
                        <button
                          type="button"
                          className="mt-0.5 break-all text-left font-mono text-xs text-primary/80 transition-colors hover:text-primary hover:underline"
                          onClick={() => {
                            navigator.clipboard.writeText(d.value);
                            toast({
                              title: "Copied to clipboard",
                              description: d.label + " copied.",
                            });
                          }}
                        >
                          {d.value}
                        </button>
                      ) : (
                        <span className="mt-0.5 block text-xs text-primary/80">
                          {d.value}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Action */}
          {item.action && (
            <div className="mt-3">
              {item.action.href ? (
                <Button asChild variant="ui" size="small">
                  <Link href={item.action.href}>{item.action.label}</Link>
                </Button>
              ) : item.action.onClick ? (
                <Button
                  variant="ui"
                  size="small"
                  onClick={item.action.onClick}
                >
                  {item.action.label}
                </Button>
              ) : null}
            </div>
          )}
        </div>
      );
    });
  }

  return (
    <div className="mx-4 mt-4 space-y-4 md:mx-8 md:space-y-8">
      <div className="bg-card rounded-xl border border-border/70 p-4 md:p-6">
        <Text
          heading="h2"
          className="text-sm font-medium text-primary-accent"
        >
          Capital Summary
        </Text>
        <div className="mt-4 space-y-4">
          <div className="space-y-2">
            <Resource
              isLoaded={!satsLoading}
              placeholder={<Skeleton className="h-10 w-[200px]" />}
            >
              <Text className="text-xl font-semibold tabular-nums tracking-tight sm:text-2xl md:text-4xl">
                {totalBalanceLabel}
              </Text>
            </Resource>
            <Text className="text-sm tabular-nums text-primary-accent">
              ≈ ${totalBalanceUSDString}
            </Text>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-lg border border-outline/70 p-3">
              <Text className="text-xs text-primary-accent">
                Available to Trade
              </Text>
              <Resource
                isLoaded={!satsLoading}
                placeholder={<Skeleton className="mt-2 h-5 w-[120px]" />}
              >
                <Text className="mt-2 text-sm font-medium tabular-nums text-primary md:text-base">
                  {availableToTradeLabel}
                </Text>
              </Resource>
              <Text className="mt-1 text-xs tabular-nums text-primary-accent">
                ≈ ${availableToTradeUSDString}
              </Text>
            </div>

            <div className="rounded-lg border border-outline/70 p-3">
              <Text className="text-xs text-primary-accent">
                Locked Capital
              </Text>
              <Resource
                isLoaded={!satsLoading}
                placeholder={<Skeleton className="mt-2 h-5 w-[120px]" />}
              >
                <Text className="mt-2 text-sm font-medium tabular-nums text-primary md:text-base">
                  {lockedCapitalLabel}
                </Text>
              </Resource>
              <Text className="mt-1 text-xs tabular-nums text-primary-accent">
                ≈ ${lockedCapitalUSDString}
              </Text>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border/70 p-4 md:p-6">
        <Text
          heading="h2"
          className="text-sm font-medium text-primary-accent"
        >
          Quick Actions
        </Text>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Button asChild variant="ui" size="small">
            <Link href="/deposit">Deposit</Link>
          </Button>
          <Button asChild variant="ui" size="small">
            <Link href="/withdrawal">Withdraw</Link>
          </Button>
          <TransferDialog defaultAccount="funding">
            <Button variant="ui" size="small">Transfer</Button>
          </TransferDialog>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border/70 p-4 md:p-6">
        <div className="flex items-center justify-between gap-3">
          <Text
            heading="h2"
            className="text-sm font-medium text-primary-accent"
          >
            Capital Allocation
          </Text>
          <Text className="hidden text-xs text-primary-accent md:block">
            Funding / Trading / Lending
          </Text>
        </div>

        <div className="mt-4 hidden h-2 overflow-hidden rounded-full bg-primary/[0.06] md:flex">
          <div
            className="h-full bg-primary/35"
            style={{ width: `${fundingPctViz}%` }}
          />
          <div
            className="h-full bg-primary/20"
            style={{ width: `${tradingPctViz}%` }}
          />
          <div
            className="h-full bg-primary/12"
            style={{ width: `${lendingPctViz}%` }}
          />
        </div>

        <div className="mt-4 space-y-4">
          <div className="grid w-full grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,auto)_minmax(0,auto)] md:items-center">
            <div className="min-w-0">
              <Text className="text-sm font-medium text-primary/80 md:text-base">
                Funding
              </Text>
              <Text className="mt-1 text-xs tabular-nums text-primary-accent">
                {fundingPctViz.toFixed(1)}% of total
              </Text>
            </div>
            <div className="md:text-center">
              <Resource
                isLoaded={!satsLoading}
                placeholder={<Skeleton className="h-5 w-[140px]" />}
              >
                <Text className="text-sm tabular-nums text-primary/80 md:text-base">
                  {fundingBalanceLabel}
                </Text>
              </Resource>
              <Text className="mt-1 text-xs tabular-nums text-primary-accent">
                ≈ ${fundingBalanceUSDString}
              </Text>
            </div>
            <div className="flex flex-wrap gap-2 md:justify-end">
              <Button asChild variant="ui" size="small">
                <Link href="/deposit">Deposit</Link>
              </Button>
              <Button asChild variant="ui" size="small">
                <Link href="/withdrawal">Withdraw</Link>
              </Button>
              <TransferDialog defaultAccount="funding">
                <Button variant="ui" size="small">Move to Trading</Button>
              </TransferDialog>
            </div>
          </div>

          <Separator />

          <div className="grid w-full grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,auto)_minmax(0,auto)] md:items-center">
            <div className="min-w-0">
              <Text className="text-sm font-medium text-primary/80 md:text-base">
                Trading
              </Text>
              <Text className="mt-1 text-xs tabular-nums text-primary-accent">
                {tradingPctViz.toFixed(1)}% of total
              </Text>
            </div>
            <div className="md:text-center">
              <Resource
                isLoaded={!satsLoading}
                placeholder={<Skeleton className="h-5 w-[140px]" />}
              >
                <Text className="text-sm tabular-nums text-primary/80 md:text-base">
                  {tradingBalanceLabel}
                </Text>
              </Resource>
              <Text className="mt-1 text-xs tabular-nums text-primary-accent">
                ≈ ${tradingBalanceUSDString}
              </Text>
            </div>
            <div className="flex flex-wrap gap-2 md:justify-end">
              <Button asChild variant="ui" size="small">
                <Link href="/">Trade</Link>
              </Button>
              <TransferDialog defaultAccount="trading">
                <Button variant="ui" size="small">Transfer</Button>
              </TransferDialog>
            </div>
          </div>

          <Separator />

          <div className="grid w-full grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,auto)_minmax(0,auto)] md:items-center">
            <div className="min-w-0">
              <Text className="text-sm font-medium text-primary/80 md:text-base">
                Lending
              </Text>
              <Text className="mt-1 text-xs tabular-nums text-primary-accent">
                {lendingPctViz.toFixed(1)}% of total
              </Text>
            </div>
            <div className="md:text-center">
              <Resource
                isLoaded={!satsLoading}
                placeholder={<Skeleton className="h-5 w-[140px]" />}
              >
                <Text className="text-sm tabular-nums text-primary/80 md:text-base">
                  {lendingBalanceLabel}
                </Text>
              </Resource>
              <Text className="mt-1 text-xs tabular-nums text-primary-accent">
                ≈ ${lendingBalanceUSDString}
              </Text>
            </div>
            <div className="flex flex-wrap gap-2 md:justify-end">
              <Button asChild variant="ui" size="small">
                <Link href="/lend">Lend</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {pending.hasAny && (
        <div className="bg-card rounded-xl border border-border/70 p-4 md:p-6">
          <Text
            heading="h2"
            className="text-sm font-medium text-primary-accent"
          >
            Pending Operations
          </Text>
          <div className="mt-4 space-y-3">{renderPendingItems(expandedInline, makeToggle(setExpandedInline))}</div>
        </div>
      )}

      <div className="bg-card rounded-xl border border-border/70 p-4 md:p-6">
        <Text
          heading="h2"
          className="text-sm font-medium text-primary-accent"
        >
          Accounts / Operations
        </Text>
        <div className="mt-4">
          <AccountSummaryDataTable
            columns={accountSummaryColumns}
            data={activeAccounts}
            subaccountTransfer={subaccountTransfer}
          />
        </div>
      </div>

      <div className="bg-card space-y-1 rounded-xl border border-border/70 p-4 md:space-y-2 md:p-6">
        <div className="flex w-full flex-col gap-2 border-b border-outline pb-2 md:flex-row md:items-center md:justify-between md:pb-0">
          <Tabs defaultValue={currentTab} className="min-w-0 w-full">
            <div className="w-full overflow-x-auto overflow-y-hidden overscroll-x-contain scrollbar-none touch-pan-x">
              <TabsList
                className="min-w-max flex-nowrap justify-start border-b-0 pr-3 max-md:space-x-3"
                variant="underline"
              >
                <TabsTrigger
                  className="shrink-0 max-md:min-h-[44px] max-md:text-xs"
                  onClick={() => setCurrentTab("wallet-activity")}
                  value="wallet-activity"
                  variant="underline"
                >
                  <span>Wallet Activity</span>
                </TabsTrigger>
                <TabsTrigger
                  className="shrink-0 max-md:min-h-[44px] max-md:text-xs"
                  onClick={() => setCurrentTab("account-ledger")}
                  value="account-ledger"
                  variant="underline"
                >
                  <span>Account Ledger</span>
                </TabsTrigger>
              </TabsList>
            </div>
          </Tabs>
        </div>

        <div className="h-full min-h-[400px] w-full overflow-visible py-1 md:overflow-auto">
          {renderTableContent()}
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border/70 p-4 md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <div className="md:flex md:items-center md:gap-2">
              <Text className="text-xs text-primary-accent">Twilight Address</Text>
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
                className="mt-1 max-w-full cursor-pointer truncate font-mono text-sm text-primary-accent underline-offset-2 hover:underline md:mt-0 md:max-w-[320px]"
                title={twilightAddress || undefined}
              >
                {truncateHash(twilightAddress)}
              </Text>
            </div>
          </div>

          <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-6">
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="inline-flex flex-col items-start rounded-md border border-outline/70 px-3 py-2 text-left transition-colors hover:bg-primary/[0.03] md:items-end"
                  aria-label={`Open pending operations center. Pending (${pendingCount})`}
                >
                  <Text className="text-xs text-primary-accent">Pending</Text>
                  <Text className="mt-1 text-sm tabular-nums text-primary">
                    Pending ({pendingCount})
                  </Text>
                </button>
              </PopoverTrigger>
              <PopoverContent
                className="w-[min(22rem,calc(100vw-2rem))] max-w-sm space-y-3 bg-background/95 p-3"
                align="end"
                side="top"
                sideOffset={8}
              >
                <div>
                  <Text className="text-sm font-medium text-primary">
                    Pending Ops Center
                  </Text>
                  <Text className="mt-1 text-xs text-primary-accent">
                    {pendingCount > 0
                      ? "Current pending operations across recovery, withdrawals, and lending."
                      : "No pending operations. All systems are settled."}
                  </Text>
                </div>
                {pendingCount > 0 ? (
                  <div className="space-y-2">{renderPendingItems(expandedPopover, makeToggle(setExpandedPopover))}</div>
                ) : (
                  <div className="rounded-lg border border-outline/70 px-3 py-4 text-center">
                    <Text className="text-sm font-medium text-primary">
                      No pending operations
                    </Text>
                    <Text className="mt-1 text-xs text-primary-accent">
                      All systems are settled.
                    </Text>
                  </div>
                )}
              </PopoverContent>
            </Popover>

            <div className="md:text-right">
              <Text className="text-xs text-primary-accent">
                Network fee balance (NYKS)
              </Text>
              <Resource
                isLoaded={!nyksLoading}
                placeholder={<Skeleton className="mt-1 h-4 w-[80px]" />}
              >
                <Text className="mt-1 text-sm tabular-nums text-primary">
                  {Intl.NumberFormat("en-US", {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 8,
                  }).format(nyksBalance)}
                </Text>
              </Resource>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Page;
