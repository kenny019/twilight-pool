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
import { ArrowUpRight, ChevronDown, ChevronRight, ChevronUp, Copy } from "lucide-react";
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

  const availableCapitalLabel = formatSatsCompact(summary.availableCapitalSats);
  const availableCapitalUSDString = usdFormatter.format(summary.availableCapitalUsd);

  const lockedCapitalLabel = formatSatsCompact(summary.lockedCapitalSats);
  const lockedCapitalUSDString = usdFormatter.format(summary.lockedCapitalUsd);
  const overviewAvailablePct =
    summary.totalBalanceSats > 0
      ? (summary.availableCapitalSats / summary.totalBalanceSats) * 100
      : 0;
  const overviewLockedPct =
    summary.totalBalanceSats > 0
      ? (summary.lockedCapitalSats / summary.totalBalanceSats) * 100
      : 0;
  const formatOverviewPct = (amountSats: number, pct: number) =>
    amountSats > 0 && pct < 0.05 ? "< 0.1%" : `${pct.toFixed(1)}%`;

  const tradingAccounts = activeAccounts.filter(
    (a) => a.type === "Trade"
  );
  const lendingAccounts = activeAccounts.filter((a) => a.type === "Lend");
  const otherAccounts = activeAccounts.filter((a) => a.type === "Account");

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
  const formatAllocationPct = (amountSats: number, pct: number) =>
    amountSats > 0 && pct < 0.05 ? "< 0.1% of total" : `${pct.toFixed(1)}% of total`;
  const getAllocationBarFillStyle = (pct: number, amountSats: number) => ({
    width: `${pct}%`,
    minWidth: amountSats > 0 ? "2px" : undefined,
  });
  const allocationItems = [
    {
      key: "funding",
      label: "Funding",
      amountSats: allocation.fundingSats,
      pct: fundingPctViz,
      pctLabel: formatAllocationPct(allocation.fundingSats, fundingPctViz),
      balanceLabel: fundingBalanceLabel,
      balanceUsd: fundingBalanceUSDString,
    },
    {
      key: "trading",
      label: "Trading",
      amountSats: allocation.tradingSats,
      pct: tradingPctViz,
      pctLabel: formatAllocationPct(allocation.tradingSats, tradingPctViz),
      balanceLabel: tradingBalanceLabel,
      balanceUsd: tradingBalanceUSDString,
    },
    {
      key: "lending",
      label: "Lending",
      amountSats: allocation.lendingMarkToValueSats,
      pct: lendingPctViz,
      pctLabel: formatAllocationPct(
        allocation.lendingMarkToValueSats,
        lendingPctViz
      ),
      balanceLabel: lendingBalanceLabel,
      balanceUsd: lendingBalanceUSDString,
    },
  ];

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
        <div
          key={item.type}
          className="rounded-lg border border-outline/70 p-3.5 md:p-4"
        >
          {/* Summary */}
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span
                  className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-yellow-500/80"
                  aria-hidden="true"
                />
                <Text className="text-sm font-medium text-primary">
                  {item.label}
                </Text>
              </div>
              <Text className="pr-2 text-xs leading-relaxed text-primary-accent">
                {item.description}
              </Text>
            </div>
            {typeof item.count === "number" && (
              <span className="shrink-0 rounded-full bg-yellow-500/15 px-2 py-0.5 text-[11px] tabular-nums text-yellow-500/80">
                {item.count} pending
              </span>
            )}
          </div>

          {/* Expand toggle — only shown when details exist */}
          {hasDetails && (
            <>
              <button
                type="button"
                className="mt-3 flex min-h-[36px] items-center gap-1 text-xs text-primary-accent transition-colors hover:text-primary"
                onClick={() => toggle(item.type)}
              >
                {isExpanded ? (
                  <ChevronUp className="h-3 w-3" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
                {isExpanded ? "Hide details" : "Show details"}
              </button>

              {isExpanded && (
                <div className="mt-2 space-y-2.5 rounded-lg bg-primary/[0.02] px-3 py-3">
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
            <div className="mt-3 flex justify-end">
              {item.action.href ? (
                <Button asChild variant="link" size="small" className="h-auto gap-1 py-0 text-xs">
                  <Link href={item.action.href}>
                    {item.action.label}
                    <ArrowUpRight className="h-3 w-3" />
                  </Link>
                </Button>
              ) : item.action.onClick ? (
                <Button
                  variant="link"
                  size="small"
                  className="h-auto gap-1 py-0 text-xs"
                  onClick={item.action.onClick}
                >
                  {item.action.label}
                  <ArrowUpRight className="h-3 w-3" />
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
      <Text heading="h1" className="text-base font-semibold text-primary">
        Wallet
      </Text>

      {/* Overview — Total balance + sub-metrics + actions */}
      <div className="bg-card rounded-xl border border-border/70 p-4 md:p-6">
        <Text
          heading="h2"
          className="text-sm font-medium text-primary-accent"
        >
          Overview
        </Text>
        <div className="mt-5 grid gap-5 md:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] md:items-start md:gap-6">
          <div className="order-1 space-y-2.5">
            <Text className="text-[10px] font-medium uppercase tracking-wider text-primary-accent/60">Total Capital</Text>
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

          <div className="order-2 space-y-4 md:col-[2] md:row-span-2 md:space-y-5 md:rounded-lg md:border md:border-outline/70 md:p-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-outline/70 p-3">
                <Text className="text-xs text-primary-accent">
                  Available Capital
                </Text>
                <Resource
                  isLoaded={!satsLoading}
                  placeholder={<Skeleton className="mt-2 h-5 w-[120px]" />}
                >
                  <Text className="mt-2 text-sm font-medium tabular-nums text-primary md:text-base">
                    {availableCapitalLabel}
                  </Text>
                </Resource>
                <Text className="mt-1 text-xs tabular-nums text-primary-accent">
                  ≈ ${availableCapitalUSDString}
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

            <div className="hidden md:block">
              <div className="flex items-center justify-between gap-3 text-[11px] tabular-nums text-primary-accent">
                <Text className="text-[11px] text-primary-accent">
                  Available {formatOverviewPct(summary.availableCapitalSats, overviewAvailablePct)}
                </Text>
                <Text className="text-[11px] text-primary-accent">
                  Locked {formatOverviewPct(summary.lockedCapitalSats, overviewLockedPct)}
                </Text>
              </div>
              <div className="mt-2 flex h-1.5 overflow-hidden rounded-full bg-outline">
                <div
                  className="h-full shrink-0 bg-theme opacity-80"
                  style={getAllocationBarFillStyle(
                    overviewAvailablePct,
                    summary.availableCapitalSats
                  )}
                />
                <div
                  className="h-full shrink-0 bg-primary-accent/25"
                  style={{ width: `${overviewLockedPct}%` }}
                />
              </div>
            </div>
          </div>

          <div className="order-3 grid grid-cols-3 gap-2 pt-1 md:col-[1] md:flex md:flex-wrap">
            <Button
              asChild
              variant="ui"
              size="small"
              className="border-green-medium/70 text-primary transition-colors hover:border-green-medium hover:text-primary max-md:h-12 max-md:bg-green-medium/10 max-md:text-base max-md:font-semibold max-md:text-green-medium max-md:active:bg-green-medium/20"
            >
              <Link href="/deposit">Deposit</Link>
            </Button>
            <Button
              asChild
              variant="ui"
              size="small"
              className="border-red/70 text-primary transition-colors hover:border-red hover:text-primary max-md:h-12 max-md:bg-red/10 max-md:text-base max-md:font-semibold max-md:text-red max-md:active:bg-red/20"
            >
              <Link href="/withdrawal">Withdraw</Link>
            </Button>
            <TransferDialog defaultAccount="funding">
              <Button
                variant="ui"
                size="small"
                className="border-theme/70 text-primary transition-colors hover:border-theme hover:text-primary max-md:h-12 max-md:bg-theme/10 max-md:text-base max-md:font-semibold max-md:text-theme max-md:active:bg-theme/20"
              >
                Transfer
              </Button>
            </TransferDialog>
          </div>
        </div>
      </div>

      {/* Pending Operations — conditional, only when items exist */}
      {pending.hasAny && (
        <div className="bg-card rounded-xl border border-border/70 p-4 md:p-6">
          <Text
            heading="h2"
            className="text-sm font-medium text-primary-accent"
          >
            Pending Operations
          </Text>
          <div className="mt-5 space-y-3.5 md:space-y-4">
            {renderPendingItems(expandedInline, makeToggle(setExpandedInline))}
          </div>
        </div>
      )}

      {/* Capital Allocation — macro summary */}
      <div className="bg-card rounded-xl border border-border/70 p-4 md:p-6">
        <div>
          <div>
            <Text
              heading="h2"
              className="text-sm font-medium text-primary-accent"
            >
              Capital Distribution
            </Text>
          </div>

          <div className="mt-5 space-y-5 md:grid md:grid-cols-3 md:gap-4 md:space-y-0">
            {allocationItems.map((item, index) => (
              <React.Fragment key={item.key}>
                <div className="md:rounded-lg md:border md:border-outline/70 md:bg-background/15 md:p-4">
                  <div className="grid w-full grid-cols-1 gap-4 md:gap-5">
                    <div className="min-w-0">
                      <Text className="text-sm font-medium text-primary/80 md:text-base">
                        {item.label}
                      </Text>
                      <Text className="mt-1 text-xs tabular-nums text-primary-accent">
                        {item.pctLabel}
                      </Text>
                      <div className="mt-3 hidden h-1.5 w-full overflow-hidden rounded-full bg-outline md:block">
                        <div
                          className="h-full rounded-full bg-theme opacity-80"
                          style={getAllocationBarFillStyle(
                            item.pct,
                            item.amountSats
                          )}
                        />
                      </div>
                    </div>
                    <div className="md:space-y-1">
                      <Resource
                        isLoaded={!satsLoading}
                        placeholder={<Skeleton className="h-5 w-[140px]" />}
                      >
                        <Text className="text-sm tabular-nums text-primary/80 md:text-base">
                          {item.balanceLabel}
                        </Text>
                      </Resource>
                      <Text className="mt-1 text-xs tabular-nums text-primary-accent md:mt-0">
                        ≈ ${item.balanceUsd}
                      </Text>
                    </div>
                  </div>
                </div>
                {index < allocationItems.length - 1 && (
                  <Separator className="md:hidden" />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* Accounts — detailed account inventory grouped by type */}
      <div className="bg-card rounded-xl border border-border/70 p-4 md:p-6">
        <Text
          heading="h2"
          className="text-sm font-medium text-primary-accent"
        >
          Accounts
        </Text>
        <div className="mt-5 space-y-7 md:space-y-8">
          {tradingAccounts.length > 0 && (
            <div>
              <Text className="mb-4 text-xs font-medium uppercase tracking-wide text-primary-accent/60">
                Trading Accounts
              </Text>
              <AccountSummaryDataTable
                columns={accountSummaryColumns}
                data={tradingAccounts}
                subaccountTransfer={subaccountTransfer}
              />
            </div>
          )}
          {lendingAccounts.length > 0 && (
            <div>
              <Text className="mb-4 text-xs font-medium uppercase tracking-wide text-primary-accent/60">
                Lending Accounts
              </Text>
              <AccountSummaryDataTable
                columns={accountSummaryColumns}
                data={lendingAccounts}
                subaccountTransfer={subaccountTransfer}
              />
            </div>
          )}
          {otherAccounts.length > 0 && (
            <div>
              <Text className="mb-4 text-xs font-medium uppercase tracking-wide text-primary-accent/60">
                Other Accounts
              </Text>
              <AccountSummaryDataTable
                columns={accountSummaryColumns}
                data={otherAccounts}
                subaccountTransfer={subaccountTransfer}
              />
            </div>
          )}
          {activeAccounts.length === 0 && (
            <p className="text-xs text-primary-accent">No accounts yet.</p>
          )}
        </div>
      </div>

      <div className="bg-card space-y-3 rounded-xl border border-border/70 p-4 md:space-y-4 md:p-6">
        <Text
          heading="h2"
          className="text-sm font-medium text-primary-accent"
        >
          History
        </Text>
        <div className="flex w-full flex-col gap-3 border-b border-outline pb-3 md:flex-row md:items-center md:justify-between md:pb-0">
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

        <div className="h-full min-h-[400px] w-full overflow-visible py-2 md:overflow-auto">
          {renderTableContent()}
        </div>
      </div>

      <div className="rounded-xl bg-muted/30 p-1">
        <Popover>
          <div className="grid grid-cols-3 divide-x divide-border/40">
            {/* Wallet Address */}
            <div className="px-4 py-3">
              <Text className="text-[11px] text-primary-accent">Wallet Address</Text>
              <div className="mt-1 flex items-center gap-1.5 min-w-0">
                <Text
                  className="truncate font-mono text-sm text-primary"
                  title={twilightAddress || undefined}
                >
                  {truncateHash(twilightAddress)}
                </Text>
                <button
                  type="button"
                  aria-label="Copy wallet address"
                  onClick={(e) => {
                    if (!twilightAddress) return;
                    e.preventDefault();
                    toast({
                      title: "Copied to clipboard",
                      description: "Copied your twilight address to the clipboard",
                    });
                    navigator.clipboard.writeText(twilightAddress);
                  }}
                  className="shrink-0 text-primary-accent transition-colors hover:text-primary"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Pending — popover trigger */}
            <PopoverTrigger asChild>
              <button
                type="button"
                aria-label={`Open pending operations. ${pendingCount} pending`}
                className="px-4 py-3 text-left transition-colors hover:bg-primary/[0.03]"
              >
                <Text className="text-[11px] text-primary-accent">Pending</Text>
                <div className="mt-1 flex items-center gap-1">
                  <Text className="text-sm tabular-nums text-primary">
                    {pendingCount === 0
                      ? "None"
                      : pendingCount === 1
                        ? "1 operation"
                        : `${pendingCount} operations`}
                  </Text>
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 text-primary-accent" />
                </div>
              </button>
            </PopoverTrigger>

            {/* Fee Balance */}
            <div className="px-4 py-3 text-right">
              <Text className="text-[11px] text-primary-accent">Fee Balance (NYKS)</Text>
              <Resource
                isLoaded={!nyksLoading}
                placeholder={<Skeleton className="mt-1 h-4 w-[80px] ml-auto" />}
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
      </div>
    </div>
  );
};

export default Page;
