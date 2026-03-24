import { PendingMasterAccountRecovery, ZkAccount } from "@/lib/types";

const DEFAULT_BLOCK_REASON =
  "Trading account recovery is in progress. Please wait for recovery to finish before trying again.";

export class MasterAccountBlockedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MasterAccountBlockedError";
  }
}

export function getMasterAccountBlockedMessage(reason?: string | null): string {
  if (typeof reason === "string" && reason.trim().length > 0) {
    return reason;
  }

  return DEFAULT_BLOCK_REASON;
}

export function assertMasterAccountActionAllowed(params: {
  masterAccountBlocked: boolean;
  masterAccountBlockReason?: string | null;
}) {
  if (params.masterAccountBlocked) {
    throw new MasterAccountBlockedError(
      getMasterAccountBlockedMessage(params.masterAccountBlockReason)
    );
  }
}

export function createPendingMasterAccountRecovery(params: {
  address: string;
  scalar: string;
  value: number;
  source: string;
  txId?: string;
  createdAt?: number;
}): PendingMasterAccountRecovery {
  return {
    address: params.address,
    scalar: params.scalar,
    value: params.value,
    source: params.source,
    txId: params.txId,
    createdAt: params.createdAt ?? Date.now(),
  };
}

export function createBlockedMasterAccountState(
  pending: PendingMasterAccountRecovery
): {
  masterAccountBlocked: true;
  masterAccountBlockReason: string;
  pendingMasterAccount: PendingMasterAccountRecovery;
} {
  return {
    masterAccountBlocked: true,
    masterAccountBlockReason: getMasterAccountBlockedMessage(
      `Trading account recovery is in progress after ${pending.source}. Please wait for recovery to finish before trying again.`
    ),
    pendingMasterAccount: pending,
  };
}

export function resolvePendingMasterAccount(
  currentMain: ZkAccount | null | undefined,
  pending: PendingMasterAccountRecovery
): ZkAccount {
  return {
    tag: "main",
    type: "Coin",
    createdAt: currentMain?.createdAt,
    zkAccountHex: currentMain?.zkAccountHex,
    ...currentMain,
    address: pending.address,
    scalar: pending.scalar,
    value: pending.value,
    isOnChain: true,
  };
}
