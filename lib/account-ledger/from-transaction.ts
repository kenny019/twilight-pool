import { AccountLedgerEntry, TransactionHistory } from "@/lib/types";

type LedgerLikeState = {
  zk: {
    zkAccounts: Array<{
      address: string;
      tag: string;
      type: string;
      value?: number;
    }>;
  };
  trade: {
    trades: Array<{
      accountAddress: string;
      isOpen: boolean;
    }>;
  };
  lend: {
    lends: Array<{
      accountAddress: string;
      orderStatus: string;
      value?: number;
    }>;
  };
  account_ledger: {
    entries: Array<{
      fund_bal_after: number | null;
      trade_bal_after: number | null;
    }>;
  };
};

type LedgerEventType = AccountLedgerEntry["type"];

function normalizeTag(tag: string) {
  return tag.trim().toLowerCase();
}

function inferLedgerType(transaction: TransactionHistory): LedgerEventType {
  const rawType = transaction.type.trim().toLowerCase();
  const fromTag = normalizeTag(transaction.fromTag);
  const toTag = normalizeTag(transaction.toTag);

  // Lend-deposit and lend-withdraw ledger entries are created by the relayer
  // path (from-relayer.ts) with richer data (order_id, proper status).
  // Transaction history rows for these are recorded for the wallet history
  // table, so map them to simple transfer/mint/burn here to avoid duplicates.
  if (rawType === "deposit lend") {
    if (fromTag === "funding") return "mint";
    return "transfer";
  }

  if (rawType === "withdraw lend") {
    if (toTag === "funding") return "burn";
    return "transfer";
  }

  if (rawType === "mint") return "mint";
  if (rawType === "burn") return "burn";
  if (rawType === "faucet" || rawType === "deposit") return "credit";
  if (rawType === "withdraw" || rawType === "withdrawal") return "debit";

  if (rawType === "transfer") {
    // Faucet sends to funding — this is a credit, not a burn.
    if (fromTag === "faucet" && toTag === "funding") return "credit";
    if (fromTag === "funding" && toTag !== "funding") return "mint";
    if (toTag === "funding" && fromTag !== "funding") return "burn";
    // All other transfers (trade→trade, trading account→subaccount, etc.)
    // remain as "transfer". Trade-open/trade-close/liquidation ledger entries
    // are created by the relayer path (from-relayer.ts) which has order_id,
    // status, and proper event timing.
    return "transfer";
  }

  return "transfer";
}

function computeTradeBalanceAfter(state: LedgerLikeState): number {
  return state.zk.zkAccounts
    .filter((a) => a.type === "Coin" || a.type === "CoinSettled")
    .reduce((sum, a) => sum + Math.round(a.value || 0), 0);
}

function computeOpenPositionsAfter(
  state: LedgerLikeState,
  excludeAddress?: string
): number {
  const tradeAddresses = new Set(
    state.trade.trades
      .filter((trade) => trade.isOpen)
      .map((trade) => trade.accountAddress)
  );
  if (excludeAddress) tradeAddresses.delete(excludeAddress);

  return state.zk.zkAccounts
    .filter((a) => a.type === "Memo" && tradeAddresses.has(a.address))
    .reduce((sum, a) => sum + Math.round(a.value || 0), 0);
}

function computeLendDepositsAfter(state: LedgerLikeState): number {
  const lendAddresses = new Set(
    state.lend.lends
      .filter((lend) => lend.orderStatus === "LENDED")
      .map((lend) => lend.accountAddress)
  );

  return state.zk.zkAccounts
    .filter((a) => a.type === "Memo" && lendAddresses.has(a.address))
    .reduce((sum, a) => sum + Math.round(a.value || 0), 0);
}

function getAccountTypeForTxSide(
  state: LedgerLikeState,
  address: string,
  fallbackType?: string
): string | undefined {
  return (
    state.zk.zkAccounts.find((a) => a.address === address)?.type || fallbackType
  );
}

function deriveDeltas(
  state: LedgerLikeState,
  transaction: TransactionHistory,
  ledgerType: LedgerEventType
): {
  fund: number;
  trade: number;
  positions: number;
  lends: number;
} {
  const amount = Math.round(transaction.value || 0);
  const fromTag = normalizeTag(transaction.fromTag);
  const toTag = normalizeTag(transaction.toTag);
  const fromType = getAccountTypeForTxSide(
    state,
    transaction.from,
    transaction.fromType
  );
  const toType = getAccountTypeForTxSide(state, transaction.to, transaction.toType);

  let fund = 0;
  let trade = 0;
  let positions = 0;
  let lends = 0;

  const applyTagBasedTradeDelta = () => {
    if (fromTag === "trading account" || fromTag === "main") trade -= amount;
    if (toTag === "trading account" || toTag === "main") trade += amount;
  };

  if (fromTag === "funding") fund -= amount;
  if (toTag === "funding") fund += amount;

  // Transfer rows often represent internal movement within the same trade pool.
  // When both account types are known, derive delta from type transition.
  if (ledgerType === "transfer") {
    if (isTradeBalanceType(fromType) && isTradeBalanceType(toType)) {
      trade += 0;
    } else if (fromType === "Memo" && isTradeBalanceType(toType)) {
      trade += amount;
    } else if (isTradeBalanceType(fromType) && toType === "Memo") {
      trade -= amount;
    } else {
      applyTagBasedTradeDelta();
    }
  } else {
    applyTagBasedTradeDelta();
  }

  // Mint increases the wallet-tracked trade balance (Coin/CoinSettled pool).
  if (ledgerType === "mint" && trade === 0) {
    trade += amount;
  }

  // For burn (ZK account → funding): the Coin/CoinSettled account may still be
  // in state or already removed. Record the delta for correct "before".
  if (ledgerType === "burn" && trade === 0) {
    if (!fromType || isTradeBalanceType(fromType)) {
      trade -= amount;
    }
  }

  if (ledgerType === "credit" && fund === 0) {
    fund += amount;
  }
  if (ledgerType === "debit" && fund === 0) {
    fund -= amount;
  }

  return { fund, trade, positions, lends };
}

function isTradeBalanceType(type: string | undefined): boolean {
  return type === "Coin" || type === "CoinSettled";
}

function computeEffectiveTradeAfter(
  state: LedgerLikeState,
  transaction: TransactionHistory,
  ledgerType: LedgerEventType,
  amount: number,
  liveTradeAfter: number
): number {
  const toZk = state.zk.zkAccounts.find((a) => a.address === transaction.to);

  // Burn always consumes from the trade-balance pool (Coin/CoinSettled).
  // In some flows, the source address changes before logging transaction history,
  // so address lookup can miss; still treat burn as reducing trade balance.
  if (ledgerType === "burn") {
    return Math.max(0, liveTradeAfter - amount);
  }

  // Mint can be inserted before destination Coin account is present in state.
  if (ledgerType === "mint" && !isTradeBalanceType(toZk?.type)) {
    return liveTradeAfter + amount;
  }

  return liveTradeAfter;
}

function computeFundAfter(
  previousFundAfter: number | null,
  deltaFund: number,
  fundingSnapshot: number | null | undefined
): number | null {
  if (previousFundAfter == null) {
    if (fundingSnapshot != null) {
      // First ledger baseline: start from the known funding snapshot and apply
      // this transaction delta to derive the "after" balance.
      return Math.round(fundingSnapshot) + deltaFund;
    }
    return null;
  }
  return previousFundAfter + deltaFund;
}

function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

export function buildLedgerEntryFromTransaction(
  state: LedgerLikeState,
  transaction: TransactionHistory
): AccountLedgerEntry {
  const now = new Date();
  const amount = Math.round(transaction.value || 0);
  const ledgerType = inferLedgerType(transaction);
  const deltas = deriveDeltas(state, transaction, ledgerType);

  const liveTradeAfter = computeTradeBalanceAfter(state);

  // If this transfer's source address is an order account (has a trade linked
  // to it), exclude it from the positions snapshot since the cleanup transfer
  // means the position is already closed.
  const fromIsOrderAccount = state.trade.trades.some(
    (t) => t.accountAddress === transaction.from
  );
  const positionsAfter = fromIsOrderAccount
    ? computeOpenPositionsAfter(state, transaction.from)
    : computeOpenPositionsAfter(state);

  const lendsAfter = computeLendDepositsAfter(state);

  const previousFundAfter =
    state.account_ledger.entries.length > 0
      ? state.account_ledger.entries[0].fund_bal_after
      : null;
  const previousTradeAfter =
    state.account_ledger.entries.length > 0
      ? state.account_ledger.entries[0].trade_bal_after
      : null;
  const fundAfterWithSnapshot = computeFundAfter(
    previousFundAfter,
    deltas.fund,
    transaction.funding_sats_snapshot
  );

  let tradeAfter = computeEffectiveTradeAfter(
    state,
    transaction,
    ledgerType,
    amount,
    liveTradeAfter
  );
  if (ledgerType === "burn" && previousTradeAfter != null) {
    tradeAfter = Math.max(0, previousTradeAfter + deltas.trade);
  }

  let tradeBefore = tradeAfter - deltas.trade;
  if (ledgerType === "transfer" && previousTradeAfter != null) {
    // Transfer rows are snapshots of internal movement after state is already
    // updated. Using inferred deltas can double-apply a Memo->Coin move (for
    // example: trade-close followed by cleanup transfer), which makes
    // trade_bal_before incorrect. Anchor transfer rows to previous/live totals.
    tradeBefore = previousTradeAfter;
    tradeAfter = liveTradeAfter;
  }
  const positionsBefore = positionsAfter - deltas.positions;
  const lendsBefore = lendsAfter - deltas.lends;
  const fundBefore =
    fundAfterWithSnapshot == null ? null : fundAfterWithSnapshot - deltas.fund;

  const fromType = getAccountTypeForTxSide(
    state,
    transaction.from,
    transaction.fromType
  );
  const toType = getAccountTypeForTxSide(state, transaction.to, transaction.toType);
  const fromAcc = `${transaction.from}-${fromType || transaction.fromTag}`;
  const toAcc = `${transaction.to}-${toType || transaction.toTag}`;

  const timestamp = toDate(transaction.date);
  const keyTime = timestamp.toISOString();

  return {
    id: crypto.randomUUID(),
    type: ledgerType,
    from_acc: fromAcc,
    to_acc: toAcc,
    amount_sats: amount,
    fund_bal: fundAfterWithSnapshot,
    trade_bal: tradeAfter,
    t_positions_bal: positionsAfter,
    l_deposits_bal: lendsAfter,
    order_id: null,
    tx_hash: transaction.tx_hash || null,
    timestamp,
    remarks: `${transaction.type}: ${transaction.fromTag} -> ${transaction.toTag}`,
    fund_bal_before: fundBefore,
    fund_bal_after: fundAfterWithSnapshot,
    trade_bal_before: tradeBefore,
    trade_bal_after: tradeAfter,
    t_positions_bal_before: positionsBefore,
    t_positions_bal_after: positionsAfter,
    l_deposits_bal_before: lendsBefore,
    l_deposits_bal_after: lendsAfter,
    idempotency_key: `tx|${transaction.tx_hash || "NO_TX_HASH"}|${ledgerType}|${keyTime}|${amount}`,
    created_at: now,
    updated_at: now,
    status: "confirmed",
  };
}
