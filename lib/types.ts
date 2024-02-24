import { z } from "zod";
import { LendOrderSchema, TradeOrderSchema, ZkAccountSchema } from "./schema";

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

export type ZkAccount = z.infer<typeof ZkAccountSchema>;
export type TradeOrder = z.infer<typeof TradeOrderSchema>;
export type LendOrder = z.infer<typeof LendOrderSchema>;

export type PositionTypes = "LONG" | "SHORT";
export type OrderTypes = "LIMIT" | "MARKET" | "DARK" | "LEND";
