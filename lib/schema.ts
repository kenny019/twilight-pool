import { z } from "zod";

export const ZkAccountSchema = z.object({
  tag: z.string(),
  address: z.string(),
  scalar: z.string(),
  type: z.literal("Coin").or(z.literal("Memo")).or(z.literal("CoinSettled")),
  isOnChain: z.boolean().optional(),
  value: z.number().optional(), // note: sats value
  createdAt: z.number().optional(),
  zkAccountHex: z.string().optional(), // hex of zkaccount from output string, this field is only needed if account does not exist anymore on chain
});

export const TradeOrderSchema = z.object({
  accountAddress: z.string(),
  value: z.number(),
  uuid: z.string(),
  orderStatus: z.string(),
  orderType: z.string(),
  output: z.string().optional(),
  tx_hash: z.string(),
  positionType: z.string(),
  entryPrice: z.number(),
  leverage: z.number(),
  date: z.date(),
  isOpen: z.boolean(),
  realizedPnl: z.number().optional(),
  unrealizedPnl: z.number().optional(),
  availableMargin: z.number(),
  feeFilled: z.number(),
  feeSettled: z.number(),
  bankruptcyPrice: z.number(),
  bankruptcyValue: z.number(),
  entryNonce: z.number(),
  entrySequence: z.number(),
  executionPrice: z.number(),
  initialMargin: z.number(),
  liquidationPrice: z.number(),
  maintenanceMargin: z.number(),
  positionSize: z.number(),
  settlementPrice: z.number(),
  exit_nonce: z.number().optional(),
  settleLimit: z
    .object({
      position_type: z.enum(["LONG", "SHORT"]),
      price: z.string(),
      uuid: z.string(),
      created_time: z.string().optional(),
      timestamp: z.string().optional(),
    })
    .nullable(),
  takeProfit: z
    .object({
      price: z.string(),
      position_type: z.string().optional(),
      uuid: z.string().optional(),
      created_time: z.string().optional(),
    })
    .nullable()
    .optional(),
  stopLoss: z
    .object({
      price: z.string(),
      position_type: z.string().optional(),
      uuid: z.string().optional(),
      created_time: z.string().optional(),
    })
    .nullable()
    .optional(),
  fundingApplied: z.string().nullable(),
  fundingHistory: z
    .array(
      z.object({
        time: z.string(),
        position_side: z.string(),
        payment: z.string(),
        funding_rate: z.string(),
        order_id: z.string(),
      })
    )
    .optional(),
  // Event metadata for Order History (from transaction_hashes)
  eventSource: z.enum(["trader_order_info", "transaction_hashes"]).optional(),
  eventStatus: z.string().optional(),
  request_id: z.string().nullable().optional(),
  reason: z.string().nullable().optional(),
  old_price: z.number().nullable().optional(),
  new_price: z.number().nullable().optional(),
  priceKind: z
    .enum(["LIMIT_CLOSE", "STOP_LOSS", "TAKE_PROFIT", "NONE"])
    .optional(),
  displayPrice: z.number().nullable().optional(),
  displayPriceBefore: z.number().nullable().optional(),
  displayPriceAfter: z.number().nullable().optional(),
  eventTimestamp: z.date().optional(),
  idempotency_key: z.string().optional(),
});

export const LendOrderSchema = z.object({
  accountAddress: z.string(),
  value: z.number(), // balance in sats
  uuid: z.string(), // relayer order_id
  request_id: z.string().optional(), // RPC request id (REQID...)
  orderStatus: z.string(), // LENDED, SETTLED, CANCELLED
  timestamp: z.date(),
  withdrawPending: z.boolean().optional(),
  npoolshare: z.number().optional(), // locked shares
  pool_share_price_entry: z.number().optional(), // BTC price when lent
  apy: z.number().optional(), // APR at lend time
  payment: z.number().optional(), // rewards for withdrawals
  tx_hash: z.string().optional(), // transaction hash
  order_id: z.string().optional(), // from API
  nwithdraw: z.number().optional(), // withdrawal amount
});

export const PoolInfoSchema = z.object({
  apy: z.number(),
  tvl_btc: z.number(),
  pool_share: z.number(),
});

export const WithdrawOrderSchema = z.object({
  tx_hash: z.string(),
  created_at: z.number(),
  status: z.enum(["queued", "completed"]),
  amount: z.number(),
  withdrawAddress: z.string().optional(),
  reserveId: z.number().optional(),
});

export const TransactionHistorySchema = z.object({
  from: z.string(),
  to: z.string(),
  fromTag: z.string(),
  toTag: z.string(),
  fromType: z.string().optional(),
  toType: z.string().optional(),
  tx_hash: z.string(),
  value: z.number(),
  date: z.date(),
  type: z.string(),
  funding_sats_snapshot: z.number().nullable().optional(),
});

export const AccountLedgerEntrySchema = z.object({
  id: z.string(),
  type: z.enum([
    "credit",
    "debit",
    "mint",
    "burn",
    "transfer",
    "trade-open",
    "trade-close",
    "lend-deposit",
    "lend-withdraw",
    "settlement",
    "liquidation",
  ]),
  from_acc: z.string(),
  to_acc: z.string(),
  amount_sats: z.number(),
  fund_bal: z.number().nullable(),
  trade_bal: z.number().nullable(),
  t_positions_bal: z.number().nullable(),
  l_deposits_bal: z.number().nullable(),
  order_id: z.string().nullable().optional(),
  tx_hash: z.string().nullable().optional(),
  timestamp: z.date(),
  remarks: z.string().nullable().optional(),
  fund_bal_before: z.number().nullable(),
  fund_bal_after: z.number().nullable(),
  trade_bal_before: z.number().nullable(),
  trade_bal_after: z.number().nullable(),
  t_positions_bal_before: z.number().nullable(),
  t_positions_bal_after: z.number().nullable(),
  l_deposits_bal_before: z.number().nullable(),
  l_deposits_bal_after: z.number().nullable(),
  idempotency_key: z.string(),
  created_at: z.date(),
  updated_at: z.date(),
  status: z.enum(["pending", "confirmed", "failed"]),
});
