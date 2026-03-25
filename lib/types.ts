import { z } from "zod";
import {
  LendOrderSchema,
  PoolInfoSchema,
  TradeOrderSchema,
  TransactionHistorySchema,
  WithdrawOrderSchema,
  ZkAccountSchema,
} from "./schema";

export const btcAddressSchema = z
  .string()
  .regex(/^bc1q[02-9ac-hj-np-z]{38}$|^bc1q[02-9ac-hj-np-z]{58}$/);

export type btcAddressSchema = z.infer<typeof btcAddressSchema>;

export type registeredBtcAddressStruct = {
  btcDepositAddress: string;
  btcSatoshiTestAmount: string;
  twilightStakingAmount: string;
  twilightAddress: string;
  isConfirmed: boolean;
  CreationTwilightBlockHeight: string;
};

export type twilightRegistedBtcAddressStruct = {
  depositAddress: string;
  twilightDepositAddress: string;
};

export type TwilightApiResponse<Result> = {
  id: number;
  jsonrpc: string;
  result: Result;
};

export type SuccessResult<T> = {
  success: true;
  data: T;
};

export type FailureResult = {
  success: false;
  message: string;
};

type OutputTypeValues<OutputType extends string> = {
  [key in OutputType]: {
    encrypt: {
      c: number[];
      d: number[];
    };
    owner: string;
  };
};

export type OutputData<OutputType extends string> = {
  out_type: OutputType;
  output: OutputTypeValues<OutputType>;
};

export type UtxoData = {
  output_index: number;
  txid: number[];
};

export type ZkAccount = z.infer<typeof ZkAccountSchema>;
export type TradeOrder = z.infer<typeof TradeOrderSchema>;
export type FundingHistoryEntry = {
  time: string;
  position_side: string;
  payment: string;
  funding_rate: string;
  order_id: string;
};

export type LendOrder = z.infer<typeof LendOrderSchema>;
export type PoolInfo = z.infer<typeof PoolInfoSchema>;
export type TransactionHistory = z.infer<typeof TransactionHistorySchema>;
export type WithdrawOrder = z.infer<typeof WithdrawOrderSchema>;
export type PendingMasterAccountRecovery = {
  address: string;
  scalar: string;
  value: number;
  source: string;
  txId?: string;
  createdAt: number;
};

export type PositionTypes = "LONG" | "SHORT";
export type OrderTypes = "LIMIT" | "MARKET" | "DARK" | "LEND" | "SLTP";

export enum CandleInterval {
  ONE_MINUTE = "ONE_MINUTE",
  FIVE_MINUTE = "FIVE_MINUTE",
  FIFTEEN_MINUTE = "FIFTEEN_MINUTE",
  ONE_HOUR = "ONE_HOUR",
  FOUR_HOUR = "FOUR_HOUR",
  EIGHT_HOUR = "EIGHT_HOUR",
  TWELVE_HOUR = "TWELVE_HOUR",
  ONE_DAY = "ONE_DAY",
  ONE_DAY_CHANGE = "ONE_DAY_CHANGE",
}

export type LimitOrderData = {
  id: string;
  positionsize: number;
  price: number;
};

export enum LimitChange {
  INCREASE = 1,
  DECREASE = 0,
  EQUAL = -1,
}

export type DisplayLimitOrderData = {
  price: number;
  size: number;
  change: LimitChange;
};

export type OpenLimitOrderData = {
  ask: LimitOrderData[];
  bid: LimitOrderData[];
};

export type LendPoolInfo = {
  sequence: number;
  nonce: number;
  total_pool_share: string;
  total_locked_value: string;
  pending_orders: number;
  aggregate_log_sequence: number;
  last_snapshot_id: number;
};

export type QueryLendOrderData = {
  id: number;
  uuid: string;
  account_id: string;
  balance: string;
  order_status: string;
  order_type: string;
  entry_nonce: number;
  exit_nonce: number;
  deposit: string;
  new_lend_state_amount: string;
  timestamp: string;
  npoolshare: string;
  nwithdraw: string;
  payment: string;
  tlv0: string;
  tps0: string;
  tlv1: string;
  tps1: string;
  tlv2: string;
  tps2: string;
  tlv3: string;
  tps3: string;
  entry_sequence: number;
};
