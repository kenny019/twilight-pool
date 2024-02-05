import { z } from "zod";

export const ZkAccountSchema = z.object({
  tag: z.string(),
  address: z.string(),
  scalar: z.string(),
  isOnChain: z.boolean().optional(),
  value: z.number().optional(), // note: sats value
});
