import { z } from "zod";
import {
  LendOrderSchema,
  TradeOrderSchema,
  TransactionHistorySchema,
  ZkAccountSchema,
} from "./schema";

export const btcAddressSchema = z
  .string()
  .regex(/^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,39}$/g);

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
export type LendOrder = z.infer<typeof LendOrderSchema>;
export type TransactionHistory = z.infer<typeof TransactionHistorySchema>;

export type PositionTypes = "LONG" | "SHORT";
export type OrderTypes = "LIMIT" | "MARKET" | "DARK" | "LEND";

export enum CandleInterval {
  ONE_MINUTE = "ONE_MINUTE",
  FIVE_MINUTE = "FIVE_MINUTE",
  FIFTEEN_MINUTE = "FIFTEEN_MINUTE",
  ONE_HOUR = "ONE_HOUR",
  FOUR_HOUR = "FOUR_HOUR",
  EIGHT_HOUR = "EIGHT_HOUR",
  TWELVE_HOUR = "TWELVE_HOUR",
  ONE_DAY = "ONE_DAY",
}
