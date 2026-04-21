"use client";

import React, { useCallback, useState } from "react";
import {
  ArrowUpRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Loader2,
  XCircle,
} from "lucide-react";
import Button from "@/components/button";
import { EmptyState, TableEmptyRow } from "@/components/empty-state";
import StatusBadge from "@/components/status-badge";
import Link from "next/link";
import BTC from "@/lib/twilight/denoms";
import Big from "big.js";
import cn from "@/lib/cn";
import type { WithdrawalFeedRow } from "@/lib/hooks/useWithdrawalFeed";
import { truncateHash } from "@/lib/helpers";
import dayjs from "dayjs";

const EXPLORER = process.env.NEXT_PUBLIC_EXPLORER_URL as string;

type Props = {
  rows: WithdrawalFeedRow[];
  hasMore: boolean;
  onLoadMore: () => void;
  isLoadingMore: boolean;
  isLoading: boolean;
};

export default function WithdrawalHistoryList({
  rows,
  hasMore,
  onLoadMore,
  isLoadingMore,
  isLoading,
}: Props) {
  if (isLoading && rows.length === 0) {
    return (
      <div className="flex items-center justify-center py-10 text-primary-accent">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (rows.length === 0) {
    return <EmptyState title="No withdrawals yet." />;
  }

  return (
    <div className="w-full">
      <DesktopTable rows={rows} />
      <MobileList rows={rows} />
      {hasMore && (
        <div className="flex items-center justify-between pt-3 text-xs text-primary-accent">
          <span>{rows.length} withdrawals</span>
          <Button
            variant="link"
            onClick={onLoadMore}
            disabled={isLoadingMore}
          >
            {isLoadingMore ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Load more"
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

function DesktopTable({ rows }: { rows: WithdrawalFeedRow[] }) {
  return (
    <div className="hidden overflow-x-auto md:block">
      <table cellSpacing={0} className="relative w-full min-w-[640px]">
        <thead>
          <tr className="border-outline/10 border-b text-xs font-normal text-primary-accent">
            <th className="px-2 py-2 text-start font-medium">Amount</th>
            <th className="px-2 py-2 text-start font-medium">Destination</th>
            <th className="px-2 py-2 text-start font-medium">Reserve</th>
            <th className="px-2 py-2 text-start font-medium">Date</th>
            <th className="px-2 py-2 text-end font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <TableEmptyRow colSpan={5} title="No withdrawals yet." />
          ) : (
            rows.map((row) => {
              const r = row.indexerRow;
              const rest = row.restRow;
              const amountSats = Number(
                r?.withdrawAmount ?? rest?.withdrawAmount ?? 0
              );
              const btc = new BTC("sats", Big(amountSats))
                .convert("BTC")
                .toString();
              const destination =
                r?.withdrawAddress ?? rest?.withdrawAddress ?? "";
              const reserveId =
                r?.withdrawReserveId ?? rest?.withdrawReserveId ?? "";
              const date = r?.createdAt;
              return (
                <tr
                  key={row.key}
                  className="h-[34px] text-xs transition-colors hover:bg-theme/20"
                >
                  <td className="whitespace-nowrap px-2 py-2 font-medium tabular-nums">
                    {btc} BTC
                  </td>
                  <td className="whitespace-nowrap px-2 py-2 font-mono text-primary-accent">
                    {destination ? truncateHash(destination, 6, 6) : "—"}
                  </td>
                  <td className="whitespace-nowrap px-2 py-2 text-primary-accent">
                    #{reserveId || "—"}
                  </td>
                  <td className="whitespace-nowrap px-2 py-2 text-primary-accent">
                    {date ? dayjs(date).format("DD/MM/YYYY HH:mm") : "—"}
                  </td>
                  <td className="whitespace-nowrap px-2 py-2 text-end">
                    <StatusCell state={row.status.state} />
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

function MobileList({ rows }: { rows: WithdrawalFeedRow[] }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggle = useCallback((key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }, []);

  return (
    <div className="md:hidden">
      {rows.map((row) => {
        const r = row.indexerRow;
        const rest = row.restRow;
        const amountSats = Number(
          r?.withdrawAmount ?? rest?.withdrawAmount ?? 0
        );
        const btc = new BTC("sats", Big(amountSats)).convert("BTC").toString();
        const destination = r?.withdrawAddress ?? rest?.withdrawAddress ?? "";
        const reserveId =
          r?.withdrawReserveId ?? rest?.withdrawReserveId ?? "";
        const date = r?.createdAt
          ? dayjs(r.createdAt).format("DD/MM/YYYY HH:mm")
          : "";
        const isExpanded = expanded.has(row.key);
        const hash = rest?.txHash;

        return (
          <div key={row.key} className="border-border/40 border-b py-3">
            <div className="flex items-start justify-between gap-2">
              <span className="text-sm font-medium text-primary">Withdraw</span>
              <span className="shrink-0 text-sm tabular-nums text-primary">
                {btc} BTC
              </span>
            </div>

            <div className="mt-0.5">
              <span className="text-xs text-primary-accent">{date}</span>
            </div>

            <div className="mt-1.5 space-y-0.5 text-xs">
              {destination && (
                <MetaRow
                  label="To"
                  value={truncateHash(destination, 6, 6)}
                />
              )}
              {reserveId && <MetaRow label="Reserve" value={`#${reserveId}`} />}
            </div>

            {hash && (
              <>
                <button
                  type="button"
                  className="mt-1 flex min-h-[44px] w-full items-center gap-1 text-xs text-primary-accent/60 transition-colors hover:text-primary-accent"
                  onClick={() => toggle(row.key)}
                >
                  {isExpanded ? (
                    <ChevronUp className="h-3 w-3" />
                  ) : (
                    <ChevronDown className="h-3 w-3" />
                  )}
                  {isExpanded ? "Hide hash" : "View hash"}
                </button>
                {isExpanded && <ExpandedHash hash={hash} className="mt-1" />}
              </>
            )}

            <div className="mt-2">
              <StatusCell state={row.status.state} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="w-12 shrink-0 text-[10px] uppercase tracking-wide text-primary-accent/50">
        {label}
      </span>
      <span className="min-w-0 truncate font-mono text-primary-accent/80">
        {value}
      </span>
    </div>
  );
}

function ExpandedHash({
  hash,
  className,
}: {
  hash: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "space-y-2 rounded-lg bg-primary/[0.02] px-3 py-2.5 text-xs",
        className
      )}
    >
      <div>
        <span className="block text-[10px] uppercase tracking-wide text-primary-accent/60">
          Hash
        </span>
        <div className="mt-0.5 space-y-1">
          <button
            type="button"
            className="font-mono break-all text-left text-primary/80 transition-colors hover:text-primary hover:underline"
            onClick={() => navigator.clipboard.writeText(hash)}
          >
            {hash}
          </button>
          <Link
            href={`${EXPLORER}/txs/${hash}`}
            target="_blank"
            className="inline-flex items-center gap-1 text-primary-accent/60 underline-offset-2 hover:text-primary hover:underline"
          >
            View on Explorer
            <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}

function StatusCell({ state }: { state: string }) {
  if (state === "settled") {
    return (
      <StatusBadge
        variant="success"
        icon={<CheckCircle2 className="h-3 w-3" />}
      >
        Settled
      </StatusBadge>
    );
  }
  if (state === "failed") {
    return (
      <StatusBadge variant="danger" icon={<XCircle className="h-3 w-3" />}>
        Failed
      </StatusBadge>
    );
  }
  return <StatusBadge variant="muted">{state}</StatusBadge>;
}
