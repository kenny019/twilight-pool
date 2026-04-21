"use client";

import React from "react";
import { ArrowUpRight } from "lucide-react";
import StatusBadge from "@/components/status-badge";
import StatusTimeline, {
  type StatusTimelineStep,
} from "@/components/status-timeline";
import { Text } from "@/components/typography";
import Link from "next/link";
import BTC from "@/lib/twilight/denoms";
import Big from "big.js";
import type { WithdrawalFeedRow } from "@/lib/hooks/useWithdrawalFeed";
import { truncateHash } from "@/lib/helpers";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

type Props = {
  rows: WithdrawalFeedRow[];
};

const STEP_ORDER = ["requested", "broadcast", "confirming", "settled"] as const;

const STEP_LABELS: Record<string, string> = {
  requested: "Request submitted",
  broadcast: "Broadcast to Bitcoin",
  confirming: "Confirming",
  settled: "Settled",
};

const EXPLORER = process.env.NEXT_PUBLIC_EXPLORER_URL as string;

export default function ActiveWithdrawalsPanel({ rows }: Props) {
  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed bg-background px-4 py-6 text-center text-sm text-primary-accent">
        No withdrawals in flight. Tap <strong>New withdrawal</strong> to start.
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {rows.map((row) => (
        <li key={row.key}>
          <ActiveWithdrawalCard row={row} />
        </li>
      ))}
    </ul>
  );
}

function ActiveWithdrawalCard({ row }: { row: WithdrawalFeedRow }) {
  const indexer = row.indexerRow;
  const rest = row.restRow;
  const amountSats = Number(
    indexer?.withdrawAmount ?? rest?.withdrawAmount ?? 0
  );
  const btc = new BTC("sats", Big(amountSats)).convert("BTC").toString();
  const destination = indexer?.withdrawAddress ?? rest?.withdrawAddress ?? "";
  const reserveId = indexer?.withdrawReserveId ?? rest?.withdrawReserveId ?? "";
  const txHash = rest?.txHash;
  const btcTxid = indexer?.withdrawIdentifier;
  const createdAt = indexer?.createdAt;
  const state = row.status.state;

  if (state === "failed") {
    return (
      <div className="flex flex-col gap-3 rounded-lg border border-red-500/30 bg-red-500/5 p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex flex-col gap-1 min-w-0">
            <Text className="text-[11px] font-medium uppercase tracking-wider text-primary-accent/70">
              Failed withdrawal
            </Text>
            <Text heading="h3" className="text-xl font-semibold sm:text-2xl">
              <span className="font-mono">{btc} BTC</span>
            </Text>
            <Text className="text-xs text-primary-accent">
              To {truncateHash(destination, 6, 6)} · Reserve #{reserveId}
            </Text>
          </div>
          <StatusBadge variant="danger">Failed</StatusBadge>
        </div>
        <Text className="text-xs text-red-500/80">
          The originating transaction failed. Open a new withdrawal to retry.
        </Text>
      </div>
    );
  }

  const steps: StatusTimelineStep[] = STEP_ORDER.map((id) => {
    const stepState = stepStateFor(id, state);
    const timestamp =
      id === "requested" && createdAt && stepState !== "pending"
        ? dayjs(createdAt).fromNow()
        : undefined;
    const meta =
      id === "confirming" && state === "confirming"
        ? confirmMeta(row.status.confirmations, row.status.etaMinutes)
        : undefined;
    return { id, label: STEP_LABELS[id], state: stepState, timestamp, meta };
  });

  const headline = renderHeadline(state, btc, row.status.etaMinutes);

  return (
    <div className="flex flex-col gap-4 rounded-lg border bg-background p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1 min-w-0">
          <Text className="text-[11px] font-medium uppercase tracking-wider text-primary-accent/70">
            Current withdrawal
          </Text>
          {headline}
          <Text className="text-xs text-primary-accent">
            To {truncateHash(destination, 6, 6)} · Reserve #{reserveId}
          </Text>
        </div>
        <StatusBadge variant={badgeVariantFor(state)}>
          {statusLabel(state)}
        </StatusBadge>
      </div>

      <StatusTimeline steps={steps} orientation="horizontal" />

      <div className="flex flex-wrap items-center gap-3 border-t border-primary-accent/10 pt-3 text-[11px] text-primary-accent">
        {txHash && (
          <Link
            href={`${EXPLORER}/txs/${txHash}`}
            target="_blank"
            className="flex items-center gap-1 font-mono hover:underline"
          >
            Twilight tx {truncateHash(txHash)}
            <ArrowUpRight className="h-3 w-3" />
          </Link>
        )}
        {btcTxid && (
          <Link
            href={`https://mempool.space/tx/${btcTxid}`}
            target="_blank"
            className="flex items-center gap-1 font-mono hover:underline"
          >
            mempool.space
            <ArrowUpRight className="h-3 w-3" />
          </Link>
        )}
      </div>
    </div>
  );
}

function renderHeadline(
  state: string,
  btc: string,
  etaMinutes: number | undefined
) {
  const amount = <span className="font-mono">{btc} BTC</span>;
  const eta =
    typeof etaMinutes === "number" && etaMinutes > 0 ? (
      <>
        {" "}· ETA <span className="text-theme">~{etaMinutes}m</span>
      </>
    ) : null;

  if (state === "settled") {
    return (
      <Text heading="h3" className="text-xl font-semibold leading-snug sm:text-2xl">
        {amount}
      </Text>
    );
  }
  if (state === "confirming") {
    return (
      <Text heading="h3" className="text-xl font-semibold leading-snug sm:text-2xl">
        {amount} confirming{eta}
      </Text>
    );
  }
  if (state === "broadcast") {
    return (
      <Text heading="h3" className="text-xl font-semibold leading-snug sm:text-2xl">
        {amount} broadcast to Bitcoin{eta}
      </Text>
    );
  }
  return (
    <Text heading="h3" className="text-xl font-semibold leading-snug sm:text-2xl">
      {amount} queued for broadcast
    </Text>
  );
}

function stepStateFor(
  id: string,
  current: string
): StatusTimelineStep["state"] {
  const idx = STEP_ORDER.indexOf(id as (typeof STEP_ORDER)[number]);
  const cur = STEP_ORDER.indexOf(current as (typeof STEP_ORDER)[number]);
  if (cur < 0) return "pending";
  if (idx < cur) return "done";
  if (idx === cur) return current === "settled" ? "done" : "active";
  return "pending";
}

function badgeVariantFor(
  state: string
): React.ComponentProps<typeof StatusBadge>["variant"] {
  switch (state) {
    case "settled":
      return "success";
    case "confirming":
    case "broadcast":
      return "warn";
    case "requested":
      return "pending";
    case "failed":
      return "danger";
    default:
      return "muted";
  }
}

function statusLabel(state: string) {
  switch (state) {
    case "settled":
      return "Settled";
    case "confirming":
      return "Confirming";
    case "broadcast":
      return "Broadcast";
    case "requested":
      return "Requested";
    case "failed":
      return "Failed";
    default:
      return state;
  }
}

function confirmMeta(confirmations?: number, etaMinutes?: number) {
  const conf =
    typeof confirmations === "number" ? `${confirmations} / 1 conf` : "";
  const eta =
    typeof etaMinutes === "number" && etaMinutes > 0 ? `~${etaMinutes}m` : "";
  return [conf, eta].filter(Boolean).join(" · ");
}
