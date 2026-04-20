"use client";

import React from "react";
import { ArrowUpRight, CheckCircle2, Loader2 } from "lucide-react";
import Button from "@/components/button";
import { EmptyState } from "@/components/empty-state";
import StatusBadge from "@/components/status-badge";
import { Text } from "@/components/typography";
import Link from "next/link";
import BTC from "@/lib/twilight/denoms";
import Big from "big.js";
import type { DepositFeedRow } from "@/lib/hooks/useDepositFeed";
import { truncateHash } from "@/lib/helpers";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

type Props = {
  rows: DepositFeedRow[];
  hasMore: boolean;
  onLoadMore: () => void;
  isLoadingMore: boolean;
  isLoading: boolean;
};

const EXPLORER = process.env.NEXT_PUBLIC_EXPLORER_URL as string;

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
    return (
      <EmptyState
        title="No deposits yet"
        description="Completed deposits will appear here."
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <HistoryDesktopTable rows={rows} />
      <HistoryMobileList rows={rows} />
      {hasMore && (
        <div className="flex justify-center pt-2">
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

function HistoryDesktopTable({ rows }: { rows: DepositFeedRow[] }) {
  return (
    <div className="hidden md:block">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs text-primary-accent">
            <th className="py-2 pr-4 font-medium">Amount</th>
            <th className="py-2 pr-4 font-medium">Reserve</th>
            <th className="py-2 pr-4 font-medium">Date</th>
            <th className="py-2 pr-4 font-medium">Tx</th>
            <th className="py-2 pr-4 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const r = row.indexerRow;
            const btc = r
              ? new BTC("sats", Big(r.depositAmount)).convert("BTC").toString()
              : "—";
            return (
              <tr key={row.key} className="border-b last:border-none">
                <td className="py-2 pr-4 font-mono">{btc} BTC</td>
                <td className="py-2 pr-4 font-mono text-xs">
                  {r ? truncateHash(r.reserveAddress, 6, 6) : "—"}
                </td>
                <td className="py-2 pr-4 text-xs text-primary-accent">
                  {r ? dayjs(r.createdAt).format("MMM D, HH:mm") : "—"}
                </td>
                <td className="py-2 pr-4">
                  {r?.txHash ? (
                    <Link
                      href={`${EXPLORER}/txs/${r.txHash}`}
                      target="_blank"
                      className="flex items-center gap-1 font-mono text-xs text-primary-accent hover:underline"
                    >
                      {truncateHash(r.txHash)}
                      <ArrowUpRight className="h-3 w-3" />
                    </Link>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="py-2 pr-4">
                  <StatusBadge
                    variant="success"
                    icon={<CheckCircle2 className="h-3 w-3" />}
                  >
                    Credited
                  </StatusBadge>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function HistoryMobileList({ rows }: { rows: DepositFeedRow[] }) {
  return (
    <ul className="flex flex-col gap-1 md:hidden">
      {rows.map((row) => {
        const r = row.indexerRow;
        const btc = r
          ? new BTC("sats", Big(r.depositAmount)).convert("BTC").toString()
          : "—";
        const metaParts: string[] = [];
        if (r?.createdAt) metaParts.push(dayjs(r.createdAt).fromNow());
        if (r?.reserveAddress)
          metaParts.push(`Reserve ${truncateHash(r.reserveAddress, 4, 4)}`);
        if (r?.txHash) metaParts.push(truncateHash(r.txHash));
        const meta = metaParts.join(" · ");
        return (
          <li
            key={row.key}
            className="flex items-center justify-between gap-3 border-b py-3 last:border-none"
          >
            <div className="flex flex-col gap-0.5 min-w-0">
              <div className="flex items-center gap-2">
                <Text className="font-mono text-sm">{btc} BTC</Text>
                {r?.txHash && (
                  <Link
                    href={`${EXPLORER}/txs/${r.txHash}`}
                    target="_blank"
                    aria-label="View on explorer"
                    className="text-primary-accent/60 hover:text-primary-accent"
                  >
                    <ArrowUpRight className="h-3 w-3" />
                  </Link>
                )}
              </div>
              <Text className="truncate font-mono text-[11px] text-primary-accent">
                {meta}
              </Text>
            </div>
            <StatusBadge
              variant="success"
              icon={<CheckCircle2 className="h-3 w-3" />}
            >
              Credited
            </StatusBadge>
          </li>
        );
      })}
    </ul>
  );
}
