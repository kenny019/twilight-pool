"use client";

import { useMemo, useSyncExternalStore } from "react";
import dayjs from "dayjs";
import { useWallet } from "@cosmos-kit/react-lite";
import useGetNyksBalance from "@/lib/hooks/useGetNyksBalance";
import useGetTwilightBTCBalance from "@/lib/hooks/useGetTwilightBtcBalance";
import { formatSatsCompact } from "@/lib/helpers";
import { computeLendingMarkToValue } from "@/lib/lend/lend-mark-to-value";
import { usePriceFeed } from "@/lib/providers/feed";
import { useSessionStore } from "@/lib/providers/session";
import { useTwilightStore } from "@/lib/providers/store";
import type { AccountSlices } from "@/lib/state/utils";

export type ActiveAccount = {
  address: string;
  tag: string;
  createdAt: number;
  value: number;
  type: "Lend" | "Trade" | "Account";
  utilized: boolean;
  txHash: string;
};

export type PendingItem = {
  type: "recovery" | "btc-withdrawal" | "lend-withdrawal";
  label: string;
  description: string;
  count?: number;
  action?: { label: string; href?: string; onClick?: () => void };
  details?: Array<{ label: string; value: string; mono?: boolean }>;
};

type WalletData = {
  summary: {
    totalBalanceSats: number;
    availableCapitalSats: number;
    lockedCapitalSats: number;
    totalBalanceUsd: number;
    availableCapitalUsd: number;
    lockedCapitalUsd: number;
  };
  allocation: {
    fundingSats: number;
    tradingSats: number;
    lendingMarkToValueSats: number;
    fundingUsd: number;
    tradingUsd: number;
    lendingMarkToValueUsd: number;
    fundingPct: number;
    tradingPct: number;
    lendingPct: number;
  };
  pending: {
    hasAny: boolean;
    items: PendingItem[];
  };
  accounts: {
    activeAccounts: ActiveAccount[];
  };
  utility: {
    twilightAddress: string;
    nyksBalance: number;
    nyksLoading: boolean;
    fundingLoading: boolean;
  };
  price: {
    btcPriceUsd: number;
  };
  activity: {
    transactionHistory: AccountSlices["history"]["transactions"];
    accountLedgerEntries: AccountSlices["account_ledger"]["entries"];
  };
};

function satsToUsd(sats: number, btcPriceUsd: number) {
  return (sats / 100_000_000) * btcPriceUsd;
}

export default function useWalletData(): WalletData {
  const btcPrice = useSessionStore((state) => state.price.btcPrice);
  const zkAccounts = useTwilightStore((state) => state.zk.zkAccounts);
  const masterAccountBlocked = useTwilightStore(
    (state) => state.zk.masterAccountBlocked
  );
  const masterAccountBlockReason = useTwilightStore(
    (state) => state.zk.masterAccountBlockReason
  );
  const pendingMasterAccount = useTwilightStore(
    (state) => state.zk.pendingMasterAccount
  );
  const trades = useTwilightStore((state) => state.trade.trades);
  const lends = useTwilightStore((state) => state.lend.lends);
  const poolInfo = useTwilightStore((state) => state.lend.poolInfo);
  const withdrawals = useTwilightStore((state) => state.withdraw.withdrawals);
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
  const btcPriceUsd = liveBtcPrice || btcPrice;

  const { twilightSats, isLoading: fundingLoading } =
    useGetTwilightBTCBalance();
  const { nyksBalance, isLoading: nyksLoading } = useGetNyksBalance();
  const { mainWallet } = useWallet();

  const twilightAddress = mainWallet?.getChainWallet("nyks")?.address || "";

  const tradingSats =
    zkAccounts.find((account) => account.tag === "main")?.value || 0;

  const committedCapitalSats = useMemo(() => {
    return zkAccounts
      .filter((account) => account.tag !== "main" && account.type === "Memo")
      .reduce((acc, account) => acc + (account.value || 0), 0);
  }, [zkAccounts]);

  const lendingMarkToValue = useMemo(() => {
    return computeLendingMarkToValue(lends, poolInfo?.pool_share ?? 0);
  }, [lends, poolInfo?.pool_share]);

  const fundingSats = twilightSats;
  const lendingMarkToValueSats = lendingMarkToValue.markToValueSats;

  const summary = useMemo(() => {
    const totalBalanceSats = fundingSats + tradingSats + lendingMarkToValueSats;
    // Overview model: Total Capital = Available Capital + Locked Capital.
    // Locked capital is derived from the current committed/in-use source,
    // then clamped so the rendered overview remains internally consistent.
    const lockedCapitalSats = Math.min(
      Math.max(committedCapitalSats, 0),
      Math.max(totalBalanceSats, 0)
    );
    const availableCapitalSats = Math.max(totalBalanceSats - lockedCapitalSats, 0);

    return {
      totalBalanceSats,
      availableCapitalSats,
      lockedCapitalSats,
      totalBalanceUsd: satsToUsd(totalBalanceSats, btcPriceUsd),
      availableCapitalUsd: satsToUsd(availableCapitalSats, btcPriceUsd),
      lockedCapitalUsd: satsToUsd(lockedCapitalSats, btcPriceUsd),
    };
  }, [
    btcPriceUsd,
    committedCapitalSats,
    fundingSats,
    lendingMarkToValueSats,
    tradingSats,
  ]);

  const allocation = useMemo(() => {
    const allocationTotal = fundingSats + tradingSats + lendingMarkToValueSats;

    return {
      fundingSats,
      tradingSats,
      lendingMarkToValueSats,
      fundingUsd: satsToUsd(fundingSats, btcPriceUsd),
      tradingUsd: satsToUsd(tradingSats, btcPriceUsd),
      lendingMarkToValueUsd: satsToUsd(lendingMarkToValueSats, btcPriceUsd),
      fundingPct:
        allocationTotal > 0 ? (fundingSats / allocationTotal) * 100 : 0,
      tradingPct:
        allocationTotal > 0 ? (tradingSats / allocationTotal) * 100 : 0,
      lendingPct:
        allocationTotal > 0
          ? (lendingMarkToValueSats / allocationTotal) * 100
          : 0,
    };
  }, [btcPriceUsd, fundingSats, lendingMarkToValueSats, tradingSats]);

  const pending = useMemo(() => {
    const items: PendingItem[] = [];
    const pendingBtcWithdrawals = withdrawals.filter(
      (withdrawal) => withdrawal.status === "queued"
    );
    const pendingLendWithdrawals = lends.filter(
      (lend) => lend.withdrawPending === true
    );

    if (masterAccountBlocked) {
      const recoveryDetails: PendingItem["details"] = [];
      if (pendingMasterAccount) {
        recoveryDetails.push(
          { label: "Amount at risk", value: formatSatsCompact(pendingMasterAccount.value) },
          { label: "Started", value: dayjs(pendingMasterAccount.createdAt).format("DD/MM/YYYY HH:mm") },
          { label: "Source", value: pendingMasterAccount.source },
        );
        if (pendingMasterAccount.txId) {
          recoveryDetails.push({ label: "TxID", value: pendingMasterAccount.txId, mono: true });
        }
      }
      items.push({
        type: "recovery",
        label: "Account Recovery Required",
        description: pendingMasterAccount
          ? `Recovery in progress for ${formatSatsCompact(
              pendingMasterAccount.value
            )} since ${dayjs(pendingMasterAccount.createdAt).format(
              "DD/MM/YYYY HH:mm"
            )}.`
          : masterAccountBlockReason ?? "Trading account requires recovery.",
        details: recoveryDetails.length > 0 ? recoveryDetails : undefined,
      });
    }

    if (pendingBtcWithdrawals.length > 0) {
      const totalSats = pendingBtcWithdrawals.reduce((s, w) => s + w.amount, 0);
      const btcDetails: PendingItem["details"] = [
        { label: "Total queued", value: formatSatsCompact(totalSats) },
      ];
      pendingBtcWithdrawals.forEach((w, i) => {
        const prefix = pendingBtcWithdrawals.length > 1 ? `#${i + 1} ` : "";
        btcDetails.push({ label: `${prefix}Amount`, value: formatSatsCompact(w.amount) });
        // created_at is milliseconds (Date.now()), not unix seconds
        btcDetails.push({ label: `${prefix}Queued`, value: dayjs(w.created_at).format("DD/MM/YYYY HH:mm") });
        if (typeof w.reserveId === "number") {
          btcDetails.push({ label: `${prefix}Reserve`, value: `#${w.reserveId}` });
        }
        if (w.withdrawAddress) {
          btcDetails.push({ label: `${prefix}Address`, value: w.withdrawAddress, mono: true });
        }
        if (w.tx_hash) {
          btcDetails.push({ label: `${prefix}TxHash`, value: w.tx_hash, mono: true });
        }
      });
      items.push({
        type: "btc-withdrawal",
        label: "BTC Withdrawal Pending",
        description:
          pendingBtcWithdrawals.length === 1
            ? `1 BTC withdrawal pending (${formatSatsCompact(totalSats)}).`
            : `${pendingBtcWithdrawals.length} BTC withdrawals pending (${formatSatsCompact(totalSats)}).`,
        count: pendingBtcWithdrawals.length,
        action: { label: "View Withdrawals", href: "/withdrawal" },
        details: btcDetails,
      });
    }

    if (pendingLendWithdrawals.length > 0) {
      const totalLendSats = pendingLendWithdrawals.reduce((s, l) => s + (l.nwithdraw ?? l.value), 0);
      const lendDetails: PendingItem["details"] = [];
      pendingLendWithdrawals.forEach((l, i) => {
        const prefix = pendingLendWithdrawals.length > 1 ? `#${i + 1} ` : "";
        const amount = l.nwithdraw ?? l.value;
        lendDetails.push({ label: `${prefix}Amount`, value: formatSatsCompact(amount) });
        lendDetails.push({ label: `${prefix}Started`, value: dayjs(l.timestamp).format("DD/MM/YYYY HH:mm") });
        if (l.uuid) {
          lendDetails.push({ label: `${prefix}Order`, value: l.uuid, mono: true });
        }
        if (l.tx_hash) {
          lendDetails.push({ label: `${prefix}TxHash`, value: l.tx_hash, mono: true });
        }
      });
      items.push({
        type: "lend-withdrawal",
        label: "Lend Withdrawal Pending",
        description:
          pendingLendWithdrawals.length === 1
            ? `1 lend withdrawal in progress (${formatSatsCompact(totalLendSats)}).`
            : `${pendingLendWithdrawals.length} lend withdrawals in progress (${formatSatsCompact(totalLendSats)}).`,
        count: pendingLendWithdrawals.length,
        action: { label: "View Lending", href: "/lend" },
        details: lendDetails,
      });
    }

    return {
      hasAny: items.length > 0,
      items,
    };
  }, [
    lends,
    masterAccountBlocked,
    masterAccountBlockReason,
    pendingMasterAccount,
    withdrawals,
  ]);

  const activeAccounts = useMemo(() => {
    const tradesByAddress = new Map(
      trades.map((trade) => [trade.accountAddress, trade])
    );
    const lendsByAddress = new Map(
      lends.map((lend) => [lend.accountAddress, lend])
    );

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

      acc.push({
        address: account.address,
        tag: account.tag === "main" ? "Primary Trading Account" : account.tag,
        createdAt: account.createdAt || dayjs().unix(),
        value: account.value || 0,
        type,
        utilized: account.type === "Memo",
        txHash: trade?.tx_hash || lend?.tx_hash || "",
      });

      return acc;
    }, []);
  }, [zkAccounts, trades, lends]);

  return {
    summary,
    allocation,
    pending,
    accounts: {
      activeAccounts,
    },
    utility: {
      twilightAddress,
      nyksBalance,
      nyksLoading,
      fundingLoading,
    },
    price: {
      btcPriceUsd,
    },
    activity: {
      transactionHistory,
      accountLedgerEntries,
    },
  };
}
