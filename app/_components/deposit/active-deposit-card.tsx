"use client";

import React from "react";
import { AlertTriangle } from "lucide-react";
import StatusBadge from "@/components/status-badge";
import Stepper, { type StepperStep } from "@/components/stepper";
import { Text } from "@/components/typography";
import {
  confirmationsMeta,
  passiveStepState,
} from "@/lib/passiveStepState";
import type { DepositStatusState } from "@/lib/derivedStatus";
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
      <div className="flex flex-col gap-3 rounded-xl border border-red/30 bg-red/5 p-4 shadow-sm">
        <div className="flex items-center gap-2 text-red">
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

  const steps: StepperStep[] = STEP_ORDER.map((id) => {
    const state = passiveStepState(id, status.state, STEP_ORDER, "credited");
    const timestamp =
      id === "awaiting_send" && createdAt && state !== "upcoming"
        ? dayjs(createdAt).fromNow()
        : undefined;
    const meta =
      id === "confirming" && status.state === "confirming"
        ? confirmationsMeta(status.confirmations, status.etaMinutes, 6)
        : undefined;
    return { id, label: STEP_LABELS[id], state, timestamp, meta };
  });

  const headline = renderHeadline(status.state, btcAmount);

  return (
    <div className="flex flex-col gap-4 rounded-xl border bg-background/90 p-5 shadow-sm">
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

      <Stepper
        steps={steps}
        currentStep={0}
        orientation="vertical"
      />
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

function badgeVariantFor(
  state: DepositStatusState
): React.ComponentProps<typeof StatusBadge>["variant"] {
  switch (state) {
    case "credited":
      return "success";
    case "confirming":
      return "active";
    case "awaiting_send":
      return "pending";
    case "reserve_expired":
      return "danger";
  }
}

function statusLabel(state: DepositStatusState): string {
  switch (state) {
    case "credited":
      return "Credited";
    case "confirming":
      return "Confirming";
    case "awaiting_send":
      return "Awaiting send";
    case "reserve_expired":
      return "Reserve expired";
  }
}
