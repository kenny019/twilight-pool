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

const PREFIX = "twilight:deposit:reserveSelection:";

export type ReserveSelection = {
  address: string;
  /** Block height at which this reserve will be swept. */
  unlockHeight: number;
  /** Reserve round at the moment of selection. */
  roundId: string;
};

function key(btcDepositAddress: string): string {
  return `${PREFIX}${btcDepositAddress}`;
}

export function readReserveSelection(
  btcDepositAddress: string
): ReserveSelection | null {
  if (typeof window === "undefined" || !btcDepositAddress) return null;
  let raw: string | null;
  try {
    raw = window.localStorage.getItem(key(btcDepositAddress));
  } catch {
    return null;
  }
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<ReserveSelection>;
    if (
      typeof parsed.address === "string" &&
      typeof parsed.unlockHeight === "number" &&
      Number.isFinite(parsed.unlockHeight) &&
      typeof parsed.roundId === "string"
    ) {
      return {
        address: parsed.address,
        unlockHeight: parsed.unlockHeight,
        roundId: parsed.roundId,
      };
    }
    return null;
  } catch {
    // Legacy plain-string entries: we can't trust the unlock height, so
    // surface no selection. The user reopening VerificationStep rewrites
    // it in the new format.
    return null;
  }
}

export function writeReserveSelection(
  btcDepositAddress: string,
  selection: ReserveSelection
): void {
  if (typeof window === "undefined" || !btcDepositAddress) return;
  try {
    window.localStorage.setItem(
      key(btcDepositAddress),
      JSON.stringify(selection)
    );
  } catch {
    // localStorage unavailable — degrade gracefully
  }
}

export function clearReserveSelection(btcDepositAddress: string): void {
  if (typeof window === "undefined" || !btcDepositAddress) return;
  try {
    window.localStorage.removeItem(key(btcDepositAddress));
  } catch {
    // ignore
  }
}
