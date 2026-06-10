// The user picks a reserve in VerificationStep and sends BTC to it. The
// registration response does not carry reserve identity, so we persist the
// user's selection here and read it back from DepositPageShell to enable
// the `reserve_expired` derivation.
//
// We persist the originally-selected `unlockHeight` and `roundId` rather
// than just the address: the live reserve list rolls forward in rounds and
// can drop the user's chosen reserve, which would otherwise either bump
// `unlockHeight` to a fresher value (masking the expiry) or lose it
// entirely (preventing reserve_expired from ever firing).

import { createKeyedStorage } from "./keyedStorage";

export type ReserveSelection = {
  address: string;
  /** Block height at which this reserve will be swept. */
  unlockHeight: number;
  /** Reserve round at the moment of selection. */
  roundId: string;
};

const storage = createKeyedStorage<ReserveSelection>(
  "twilight:deposit:reserveSelection:",
  (parsed) => {
    // Legacy plain-string entries fail this shape check, so we surface no
    // selection; the user reopening VerificationStep rewrites the new format.
    const p = parsed as Partial<ReserveSelection>;
    if (
      typeof p.address === "string" &&
      typeof p.unlockHeight === "number" &&
      Number.isFinite(p.unlockHeight) &&
      typeof p.roundId === "string"
    ) {
      return {
        address: p.address,
        unlockHeight: p.unlockHeight,
        roundId: p.roundId,
      };
    }
    return null;
  }
);

export const readReserveSelection = storage.read;
export const writeReserveSelection = storage.write;
export const clearReserveSelection = storage.clear;
