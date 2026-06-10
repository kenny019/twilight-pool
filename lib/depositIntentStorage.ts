// Repeat deposits skip the chain broadcast (the registration is already
// confirmed), so nothing on-chain marks the deposit as in-flight and the
// status shell would show nothing during the awaiting-send window. We
// persist the user's intent here when they continue past the register step
// and DepositPageShell reads it back to derive the awaiting-send card.
//
// Lifecycle: overwritten by the next deposit, cleared when a matching
// indexer row appears (the deposit became server-visible) or when the user
// dismisses the card.

import { createKeyedStorage } from "./keyedStorage";

export type DepositIntent = {
  amountSats: number;
  /** ISO timestamp — also the recency cutoff for indexer-row matching. */
  createdAt: string;
};

const storage = createKeyedStorage<DepositIntent>(
  "twilight:deposit:intent:",
  (parsed) => {
    const p = parsed as Partial<DepositIntent>;
    if (
      typeof p.amountSats === "number" &&
      Number.isFinite(p.amountSats) &&
      p.amountSats > 0 &&
      typeof p.createdAt === "string"
    ) {
      return { amountSats: p.amountSats, createdAt: p.createdAt };
    }
    return null;
  }
);

export const readDepositIntent = storage.read;
export const writeDepositIntent = storage.write;
export const clearDepositIntent = storage.clear;
