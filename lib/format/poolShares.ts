import Big from "big.js";

/** Raw pool share units per 1.0 display share (matches protocol fixed-point). */
export const POOL_SHARE_DECIMALS_SCALE = 10_000;

/**
 * Rounded whole-share count for table display (no decimals).
 * Uses Big.js to avoid float artifacts from npoolshare / scale.
 */
export function formatRoundedPoolShares(npoolshare: number): string {
  const n = Big(npoolshare)
    .div(POOL_SHARE_DECIMALS_SCALE)
    .round(0, Big.roundHalfUp);
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(n.toNumber());
}

/**
 * Precise raw npoolshare units for tooltips (integer, grouped).
 */
export function formatRawPoolShareUnits(npoolshare: number): string {
  const n = Math.round(Number(npoolshare));
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(n);
}
