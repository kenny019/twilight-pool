"use client";

import React, { useCallback, useState } from "react";
import {
  ArrowUpRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Loader2,
} from "lucide-react";
import Button from "@/components/button";
import { EmptyState, TableEmptyRow } from "@/components/empty-state";
import StatusBadge from "@/components/status-badge";
import Link from "next/link";
import BTC from "@/lib/twilight/denoms";
import Big from "big.js";
import cn from "@/lib/cn";
import type { DepositFeedRow } from "@/lib/hooks/useDepositFeed";
import { truncateHash } from "@/lib/helpers";
import dayjs from "dayjs";

const EXPLORER = process.env.NEXT_PUBLIC_EXPLORER_URL as string;

type Props = {
  rows: DepositFeedRow[];
  hasMore: boolean;
  onLoadMore: () => void;
  isLoadingMore: boolean;
  isLoading: boolean;
};

export default function DepositHistoryList({
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
    return <EmptyState title="No deposits yet." />;
  }

  return (
    <div className="w-full">
      <DesktopTable rows={rows} />
      <MobileList rows={rows} />
      {hasMore && (
        <div className="flex items-center justify-between pt-3 text-xs text-primary-accent">
          <span>{rows.length} deposits</span>
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

function DesktopTable({ rows }: { rows: DepositFeedRow[] }) {
  return (
    <div className="hidden overflow-x-auto md:block">
      <table cellSpacing={0} className="relative w-full min-w-[640px]">
        <thead>
          <tr className="border-outline/10 border-b text-xs font-normal text-primary-accent">
            <th className="px-2 py-2 text-start font-medium">Amount</th>
            <th className="px-2 py-2 text-start font-medium">Reserve</th>
            <th className="px-2 py-2 text-start font-medium">Date</th>
            <th className="px-2 py-2 text-start font-medium">Tx</th>
            <th className="px-2 py-2 text-end font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <TableEmptyRow colSpan={5} title="No deposits yet." />
          ) : (
            rows.map((row) => {
              const r = row.indexerRow;
              const btc = r
                ? new BTC("sats", Big(r.depositAmount)).convert("BTC").toString()
                : "—";
              return (
                <tr
                  key={row.key}
                  className="h-[34px] text-xs transition-colors hover:bg-theme/20"
                >
                  <td className="whitespace-nowrap px-2 py-2 font-medium tabular-nums">
                    {btc} BTC
                  </td>
                  <td className="whitespace-nowrap px-2 py-2 font-mono text-primary-accent">
                    {r ? truncateHash(r.reserveAddress, 6, 6) : "—"}
                  </td>
                  <td className="whitespace-nowrap px-2 py-2 text-primary-accent">
                    {r ? dayjs(r.createdAt).format("DD/MM/YYYY HH:mm") : "—"}
                  </td>
                  <td className="whitespace-nowrap px-2 py-2">
                    {r?.txHash ? (
                      <Link
                        href={`${EXPLORER}/txs/${r.txHash}`}
                        target="_blank"
                        className="inline-flex items-center gap-1 font-mono text-primary-accent hover:text-primary hover:underline"
                      >
                        {truncateHash(r.txHash)}
                        <ArrowUpRight className="h-3 w-3" />
                      </Link>
                    ) : (
                      <span className="text-primary-accent">—</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-2 py-2 text-end">
                    <StatusBadge
                      variant="success"
                      icon={<CheckCircle2 className="h-3 w-3" />}
                    >
                      Credited
                    </StatusBadge>
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

function MobileList({ rows }: { rows: DepositFeedRow[] }) {
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
        const btc = r
          ? new BTC("sats", Big(r.depositAmount)).convert("BTC").toString()
          : "—";
        const date = r?.createdAt
          ? dayjs(r.createdAt).format("DD/MM/YYYY HH:mm")
          : "";
        const isExpanded = expanded.has(row.key);
        const hasHash = !!r?.txHash;

        return (
          <div key={row.key} className="border-border/40 border-b py-3">
            <div className="flex items-start justify-between gap-2">
              <span className="text-sm font-medium text-primary">Deposit</span>
              <span className="shrink-0 text-sm tabular-nums text-primary">
                {btc} BTC
              </span>
            </div>

            <div className="mt-0.5">
              <span className="text-xs text-primary-accent">{date}</span>
            </div>

            <div className="mt-1.5 space-y-0.5 text-xs">
              {r?.reserveAddress && (
                <MetaRow
                  label="Reserve"
                  value={truncateHash(r.reserveAddress, 6, 6)}
                />
              )}
            </div>

            {hasHash && (
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
                {isExpanded && (
                  <ExpandedHash
                    hash={r!.txHash!}
                    className="mt-1"
                  />
                )}
              </>
            )}

            <div className="mt-2">
              <StatusBadge
                variant="success"
                icon={<CheckCircle2 className="h-3 w-3" />}
              >
                Credited
              </StatusBadge>
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
