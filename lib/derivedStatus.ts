import type { IndexerDeposit, IndexerWithdrawal } from "./api/indexer";

export type DepositStatusState =
  | "awaiting_send"
  | "confirming"
  | "credited"
  | "reserve_expired";

export type WithdrawalStatusState =
  | "requested"
  | "broadcast"
  | "confirming"
  | "settled"
  | "failed";

export type DerivedStatus<T extends string> = {
  state: T;
  confirmations?: number;
  etaMinutes?: number;
};

export type PendingDeposit = {
  btcDepositAddress: string;
  reserveAddress: string;
  amountSats: number;
  createdAt: string;
};

export type ReserveMeta = {
  unlockHeight: number;
};

export type WithdrawalRestRow = {
  withdrawIdentifier: string | number;
  withdrawAddress: string;
  withdrawReserveId: string;
  withdrawAmount: string | number;
  /** Chain-side settlement flag — fallback when the indexer lags or has no
   * row for this withdrawal. */
  isConfirmed?: boolean;
  /** Cosmos transaction hash, attached on the client from the local store. */
  txHash?: string;
};

export type TxStatus = "success" | "failed" | "pending" | null;

export type DerivationOptions = {
  // Default 6 BTC confirmations required before UI can call it "done".
  requiredConfirmations?: number;
  // Average BTC block time in minutes.
  minutesPerBlock?: number;
};

const DEFAULT_OPTIONS: Required<DerivationOptions> = {
  requiredConfirmations: 6,
  minutesPerBlock: 10,
};

function parseIntSafe(value: string | number | null | undefined): number {
  if (value === null || value === undefined || value === "") return 0;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function etaForRemaining(
  confirmations: number,
  opts: Required<DerivationOptions>
): number | undefined {
  if (confirmations >= opts.requiredConfirmations) return 0;
  const remaining = opts.requiredConfirmations - confirmations;
  return remaining * opts.minutesPerBlock;
}

export function deriveDepositStatus(
  indexerRow: IndexerDeposit | null | undefined,
  ephemeral: PendingDeposit | null | undefined,
  currentBtcBlock: number,
  reserveMeta: ReserveMeta | null | undefined,
  options: DerivationOptions = {}
): DerivedStatus<DepositStatusState> | null {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  if (indexerRow) {
    if (indexerRow.confirmed) {
      return { state: "credited" };
    }
    const btcHeight = parseIntSafe(indexerRow.btcHeight);
    const confirmations =
      btcHeight > 0 ? Math.max(0, currentBtcBlock - btcHeight) : 0;
    return {
      state: "confirming",
      confirmations,
      etaMinutes: etaForRemaining(confirmations, opts),
    };
  }

  if (ephemeral) {
    if (
      reserveMeta &&
      reserveMeta.unlockHeight > 0 &&
      currentBtcBlock >= reserveMeta.unlockHeight
    ) {
      return { state: "reserve_expired" };
    }
    return { state: "awaiting_send" };
  }

  return null;
}

export function deriveWithdrawalStatus(
  restRow: WithdrawalRestRow | null | undefined,
  indexerRow: IndexerWithdrawal | null | undefined,
  requestTxStatus: TxStatus,
  currentBtcBlock: number,
  options: DerivationOptions = {}
): DerivedStatus<WithdrawalStatusState> | null {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // A settled withdrawal (on either source) can't have a failed request tx.
  if (
    requestTxStatus === "failed" &&
    !indexerRow?.isConfirmed &&
    !restRow?.isConfirmed
  ) {
    return { state: "failed" };
  }

  // Either source marking the withdrawal settled wins: the chain flips the
  // request's isConfirmed at payout, and the indexer can lag behind it (or
  // miss the withdrawal entirely) — without this the card would sit at
  // "requested"/"confirming" forever.
  if (indexerRow?.isConfirmed || restRow?.isConfirmed) {
    return { state: "settled" };
  }

  if (indexerRow) {
    const blockHeight = parseIntSafe(indexerRow.blockHeight);
    if (blockHeight <= 0) {
      return { state: "broadcast" };
    }
    const confirmations = Math.max(0, currentBtcBlock - blockHeight);
    return {
      state: "confirming",
      confirmations,
      etaMinutes: etaForRemaining(confirmations, opts),
    };
  }

  if (restRow) {
    return { state: "requested" };
  }

  return null;
}
