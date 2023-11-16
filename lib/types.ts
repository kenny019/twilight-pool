import { z } from "zod";

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
