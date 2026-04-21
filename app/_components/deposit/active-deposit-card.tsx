"use client";

import React from "react";
import { AlertTriangle } from "lucide-react";
import StatusBadge from "@/components/status-badge";
import StatusTimeline, {
  type StatusTimelineStep,
} from "@/components/status-timeline";
import { Text } from "@/components/typography";
import BTC from "@/lib/twilight/denoms";
import Big from "big.js";
import type { DepositFeedRow } from "@/lib/hooks/useDepositFeed";
import { truncateHash } from "@/lib/helpers";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

const STEP_ORDER = ["awaiting_send", "confirming", "credited"] as const;

const STEP_LABELS: Record<string, string> = {
  awaiting_send: "Awaiting BTC send",
  confirming: "Confirming on Bitcoin",
  credited: "Credited to Twilight",
};

type Props = {
  row: DepositFeedRow;
};

export default function ActiveDepositCard({ row }: Props) {
  const { status, indexerRow, ephemeral } = row;
  const amountSats = indexerRow
    ? Number(indexerRow.depositAmount)
    : ephemeral?.amountSats ?? 0;
  const btcAmount = new BTC("sats", Big(amountSats)).convert("BTC").toString();
  const reserveAddress = indexerRow?.reserveAddress ?? ephemeral?.reserveAddress;
  const createdAt = indexerRow?.createdAt ?? ephemeral?.createdAt;

  if (status.state === "reserve_expired") {
    return (
      <div className="flex flex-col gap-3 rounded-lg border border-red-500/30 bg-red-500/5 p-4">
        <div className="flex items-center gap-2 text-red-500">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <Text heading="h3" className="text-sm font-semibold">
            Reserve expired before deposit landed
          </Text>
        </div>
        <Text className="text-xs text-primary-accent">
          Open a new deposit — a fresh reserve will be selected.
        </Text>
      </div>
    );
  }

  const steps: StatusTimelineStep[] = STEP_ORDER.map((id) => {
    const state = stepStateFor(id, status.state);
    const timestamp =
      id === "awaiting_send" && createdAt && state !== "pending"
        ? dayjs(createdAt).fromNow()
        : undefined;
    const meta =
      id === "confirming" && status.state === "confirming"
        ? confirmingMeta(status.confirmations, status.etaMinutes)
        : undefined;
    return { id, label: STEP_LABELS[id], state, timestamp, meta };
  });

  const headline = renderHeadline(status.state, btcAmount);

  return (
    <div className="flex flex-col gap-4 rounded-lg border bg-background p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1 min-w-0">
          <Text className="text-[11px] font-medium uppercase tracking-wider text-primary-accent/70">
            Current deposit
          </Text>
          {headline}
        </div>
        <StatusBadge variant={badgeVariantFor(status.state)}>
          {statusLabel(status.state)}
        </StatusBadge>
      </div>

      {reserveAddress && (
        <div className="flex items-center gap-2 text-[11px] font-mono text-primary-accent">
          <span className="rounded border border-primary-accent/15 px-1.5 py-0.5">
            Reserve
          </span>
          <span className="break-all">{truncateHash(reserveAddress, 8, 8)}</span>
        </div>
      )}

      <StatusTimeline steps={steps} orientation="vertical" />
    </div>
  );
}

function renderHeadline(state: string, btcAmount: string) {
  if (state === "awaiting_send") {
    return (
      <Text heading="h3" className="text-xl font-semibold leading-snug sm:text-2xl">
        Send <span className="font-mono">{btcAmount} BTC</span> to the reserve
        address below.
      </Text>
    );
  }
  if (state === "confirming") {
    return (
      <Text heading="h3" className="text-xl font-semibold leading-snug sm:text-2xl">
        <span className="font-mono">{btcAmount} BTC</span> detected — confirming
        on Bitcoin.
      </Text>
    );
  }
  return (
    <Text heading="h3" className="text-xl font-semibold leading-snug sm:text-2xl">
      <span className="font-mono">{btcAmount} BTC</span>
    </Text>
  );
}

function stepStateFor(
  stepId: string,
  current: string
): StatusTimelineStep["state"] {
  const idx = STEP_ORDER.indexOf(stepId as (typeof STEP_ORDER)[number]);
  const curIdx = STEP_ORDER.indexOf(
    current as (typeof STEP_ORDER)[number]
  );
  if (curIdx < 0) return "pending";
  if (idx < curIdx) return "done";
  if (idx === curIdx) return current === "credited" ? "done" : "active";
  return "pending";
}

function badgeVariantFor(
  state: string
): React.ComponentProps<typeof StatusBadge>["variant"] {
  switch (state) {
    case "credited":
      return "success";
    case "confirming":
      return "active";
    case "awaiting_send":
      return "warn";
    case "reserve_expired":
      return "danger";
    default:
      return "muted";
  }
}

function statusLabel(state: string): string {
  switch (state) {
    case "credited":
      return "Credited";
    case "confirming":
      return "Confirming";
    case "awaiting_send":
      return "Awaiting send";
    case "reserve_expired":
      return "Reserve expired";
    default:
      return state;
  }
}

function confirmingMeta(
  confirmations?: number,
  etaMinutes?: number
): string {
  const conf = typeof confirmations === "number" ? `${confirmations} / 6 conf` : "";
  const eta =
    typeof etaMinutes === "number" && etaMinutes > 0
      ? `~${etaMinutes}m left`
      : "";
  return [conf, eta].filter(Boolean).join(" · ");
}
