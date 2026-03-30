import { isErrorStatus, TransactionHash } from "@/lib/api/rest";
import { AccountLedgerEntry, TradeOrder } from "@/lib/types";

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
    }>;
  };
};

const FAILED_STATUSES = new Set([
  "DuplicateOrder",
  "UtxoError",
  "NoResponseFromChain",
  "RejectedFromChain",
  "BincodeError",
  "HexCodeError",
  "SerializationError",
  "OrderNotFound",
  "RejectedByRiskEngine",
  "RejectedByExchange",
  "RejectedByRelayer",
  "Error",
]);

const TRADE_LEDGER_ALLOWED_STATUSES = new Set([
  "PENDING",
  "FILLED",
  "SETTLED",
  "LIQUIDATE",
  "CANCELLED",
]);

export function shouldInsertTradeLedgerEvent(orderStatus: string): boolean {
  return TRADE_LEDGER_ALLOWED_STATUSES.has((orderStatus || "").toUpperCase());
}

function toDate(value: Date | string | null | undefined): Date {
  if (!value) return new Date();
  return value instanceof Date ? value : new Date(value);
}

function mapLedgerStatus(orderStatus: string): AccountLedgerEntry["status"] {
  if (orderStatus === "PENDING") return "pending";
  if (orderStatus === "CANCELLED") return "cancelled";
  if (isErrorStatus(orderStatus) || FAILED_STATUSES.has(orderStatus)) {
    return "failed";
  }
  return "confirmed";
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

function getStableFundAfter(state: LedgerLikeState): number | null {
  return state.account_ledger.entries.length > 0
    ? state.account_ledger.entries[0].fund_bal_after
    : null;
}

function mapTradeLedgerType(orderStatus: string): AccountLedgerEntry["type"] {
  if (orderStatus === "LIQUIDATE") return "liquidation";
  if (orderStatus === "SETTLED" || orderStatus === "CANCELLED")
    return "trade-close";
  if (orderStatus === "PENDING" || orderStatus === "FILLED")
    return "trade-open";
  return "settlement";
}

function inferTradeAmount(trade: TradeOrder, orderStatus: string): number {
  if (orderStatus === "LIQUIDATE") {
    return Math.round(trade.initialMargin || trade.value || 0);
  }
  if (orderStatus === "SETTLED" || orderStatus === "CANCELLED") {
    return Math.round(trade.availableMargin || trade.value || 0);
  }
  return Math.round(trade.value || trade.initialMargin || 0);
}

export function buildTradeLedgerEntryFromRelayerEvent(
  state: LedgerLikeState,
  trade: TradeOrder,
  txHash: TransactionHash
): AccountLedgerEntry {
  const now = new Date();
  const eventDate = toDate(txHash.datetime || trade.date);
  const ledgerStatus = mapLedgerStatus(txHash.order_status);
  const ledgerType = mapTradeLedgerType(txHash.order_status);
  const amount = inferTradeAmount(trade, txHash.order_status);

  const liveTradeBalance = computeTradeBalanceAfter(state);
  const lendsAfter = computeLendDepositsAfter(state);
  const fundAfter = getStableFundAfter(state);

  // Look up the actual zkAccount value for this trade's order account.
  // This may differ from `amount` (which is availableMargin for SETTLED).
  const tradeAccountValue = Math.round(
    state.zk.zkAccounts.find((a) => a.address === trade.accountAddress)
      ?.value || 0
  );

  const isClose = ledgerStatus === "confirmed" && ledgerType === "trade-close";
  const isLiquidation =
    ledgerStatus === "confirmed" && ledgerType === "liquidation";
  const isOpen = ledgerStatus === "confirmed" && ledgerType === "trade-open";
  const isAnyClose = isClose || isLiquidation;

  // For close/liquidation: exclude the closed position from the "after" snapshot.
  // The cleanup transfer hasn't happened yet, so live state still includes it.
  // For open: positions already include the new account in live state.
  const positionsAfter = isAnyClose
    ? computeOpenPositionsAfter(state, trade.accountAddress)
    : computeOpenPositionsAfter(state);
  const positionsBefore = isAnyClose
    ? positionsAfter + tradeAccountValue
    : isOpen
      ? positionsAfter - tradeAccountValue
      : positionsAfter;

  // For close: the cleanup transfer will add `amount` back to the trading account,
  // so the real "after" is live + amount. Live state is the "before".
  // For open: the margin was already deducted, so live state is the "after".
  const tradeBalAfter = isClose ? liveTradeBalance + amount : liveTradeBalance;
  const tradeBalBefore = isClose
    ? liveTradeBalance
    : isOpen
      ? liveTradeBalance + amount
      : liveTradeBalance;

  // Trade open/close is a type transition on the SAME account address:
  // Coin → Memo (open), Memo → Coin/CoinSettled (close).
  // The margin transfer between trading account and order account is a
  // separate "transfer" entry from the transaction-history path.
  const fromAcc =
    ledgerType === "trade-open"
      ? `${trade.accountAddress}-Coin`
      : `${trade.accountAddress}-Memo`;
  const toAcc =
    ledgerType === "trade-open"
      ? `${trade.accountAddress}-Memo`
      : ledgerType === "liquidation"
        ? `${trade.accountAddress}-Liquidated`
        : `${trade.accountAddress}-CoinSettled`;

  const requestId = txHash.request_id || "NO_REQUEST_ID";

  return {
    id: crypto.randomUUID(),
    type: ledgerType,
    from_acc: fromAcc,
    to_acc: toAcc,
    amount_sats: amount,
    fund_bal: fundAfter,
    trade_bal: tradeBalAfter,
    t_positions_bal: positionsAfter,
    l_deposits_bal: lendsAfter,
    order_id: txHash.order_id || trade.uuid,
    tx_hash: txHash.tx_hash || null,
    timestamp: eventDate,
    remarks:
      txHash.reason ??
      `[trade] ${txHash.order_status}${txHash.order_type ? ` (${txHash.order_type})` : ""}`,
    fund_bal_before: fundAfter,
    fund_bal_after: fundAfter,
    trade_bal_before: tradeBalBefore,
    trade_bal_after: tradeBalAfter,
    t_positions_bal_before: positionsBefore,
    t_positions_bal_after: positionsAfter,
    l_deposits_bal_before: lendsAfter,
    l_deposits_bal_after: lendsAfter,
    idempotency_key: `relayer|trade|${txHash.order_id || trade.uuid}|${txHash.order_status}|${requestId}`,
    created_at: now,
    updated_at: now,
    status: ledgerStatus,
  };
}

type LendOperation = "deposit" | "withdraw";

type LendLedgerContext = {
  accountAddress: string;
  accountTag: string;
  amountSats: number;
  fundingAddress: string;
  operation: LendOperation;
  fallbackOrderId?: string | null;
};

export function buildLendLedgerEntryFromRelayerEvent(
  state: LedgerLikeState,
  txHash: TransactionHash,
  ctx: LendLedgerContext
): AccountLedgerEntry {
  const now = new Date();
  const eventDate = toDate(txHash.datetime);
  const orderStatus = txHash.order_status;
  const ledgerStatus = mapLedgerStatus(orderStatus);
  const amount = Math.round(ctx.amountSats || 0);

  const fundAfter = getStableFundAfter(state);
  const liveTradeBalance = computeTradeBalanceAfter(state);
  const positionsAfter = computeOpenPositionsAfter(state);
  const liveLendsBalance = computeLendDepositsAfter(state);

  const ledgerType: AccountLedgerEntry["type"] =
    ctx.operation === "deposit" ? "lend-deposit" : "lend-withdraw";

  const isConfirmed = ledgerStatus === "confirmed";
  const isWithdraw = ctx.operation === "withdraw";
  const isDeposit = ctx.operation === "deposit";

  // For deposit: the lend hasn't been added to state.lend.lends yet (addLendOrder
  // runs after the relayer entries are created), so liveLendsBalance is the "before".
  // For withdraw: the lend is still in live state (cleanup hasn't happened), so
  // liveLendsBalance includes the deposit being withdrawn — subtract to get "after".
  const lendsAfter =
    isConfirmed && isDeposit
      ? liveLendsBalance + amount
      : isConfirmed && isWithdraw
        ? Math.max(0, liveLendsBalance - amount)
        : liveLendsBalance;
  const lendsBefore =
    isConfirmed && isDeposit
      ? liveLendsBalance
      : isConfirmed && isWithdraw
        ? liveLendsBalance
        : liveLendsBalance;

  // Lend deposit/withdraw is a type transition (Coin↔Memo) on the same account.
  // For deposit: zkAccount is still Coin (counted in trade_bal), will become Memo.
  // For withdraw: zkAccount is still Memo (not in trade_bal), will become CoinSettled.
  // The actual fund movement (funding↔trading) is tracked by mint/burn entries
  // from the transaction-history path, so fund_bal doesn't change here.
  const tradeAfter =
    isConfirmed && isDeposit
      ? liveTradeBalance - amount
      : isConfirmed && isWithdraw
        ? liveTradeBalance + amount
        : liveTradeBalance;
  const tradeBefore = liveTradeBalance;

  // Lend deposit/withdraw is a type transition on the SAME account:
  // Coin → Memo (deposit), Memo → CoinSettled (withdraw).
  // The fund transfer is already tracked by the transaction-history path.
  const fromAcc =
    ctx.operation === "deposit"
      ? `${ctx.accountAddress}-Coin`
      : `${ctx.accountAddress}-Memo`;
  const toAcc =
    ctx.operation === "deposit"
      ? `${ctx.accountAddress}-Memo`
      : `${ctx.accountAddress}-CoinSettled`;

  const orderId = txHash.order_id || null;
  // Idempotency may fallback to request-id scoped key when order_id is absent
  // (failed/no-response request paths).
  const idempotencyOrderId =
    txHash.order_id || ctx.fallbackOrderId || "NO_ORDER_ID";
  const requestId = txHash.request_id || "NO_REQUEST_ID";

  return {
    id: crypto.randomUUID(),
    type: ledgerType,
    from_acc: fromAcc,
    to_acc: toAcc,
    amount_sats: amount,
    fund_bal: fundAfter,
    trade_bal: tradeAfter,
    t_positions_bal: positionsAfter,
    l_deposits_bal: lendsAfter,
    order_id: orderId,
    tx_hash: txHash.tx_hash || null,
    timestamp: eventDate,
    remarks:
      txHash.reason ??
      `[lend-${ctx.operation}] ${orderStatus}${txHash.order_type ? ` (${txHash.order_type})` : ""}`,
    fund_bal_before: fundAfter,
    fund_bal_after: fundAfter,
    trade_bal_before: tradeBefore,
    trade_bal_after: tradeAfter,
    t_positions_bal_before: positionsAfter,
    t_positions_bal_after: positionsAfter,
    l_deposits_bal_before: lendsBefore,
    l_deposits_bal_after: lendsAfter,
    idempotency_key: `relayer|lend|${idempotencyOrderId}|${orderStatus}|${requestId}|${ctx.operation}`,
    created_at: now,
    updated_at: now,
    status: ledgerStatus,
  };
}
