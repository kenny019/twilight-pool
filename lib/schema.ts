import { z } from "zod";

export const SubAccountStructSchema = z.object({
  account: z.string().optional(),
  address: z.string(),
  isOnChain: z.boolean().optional(),
  tag: z.string(),
  value: z.number().optional(), // note: sats value
});
