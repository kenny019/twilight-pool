import { POOL_SHARE_DECIMALS_SCALE } from "@/lib/format/poolShares";
import type { LendOrder } from "@/lib/types";

export interface LendMarkToValue {
  /** Sum of active lend order deposit values (sats) */
  activePrincipalSats: number;
  /** Unrealized rewards based on current pool share price (sats, can be negative) */
  pendingRewardsSats: number;
  /** activePrincipalSats + pendingRewardsSats */
  markToValueSats: number;
}

/**
 * Authoritative lending mark-to-value computation.
 *
 * Mirrors the exact logic in my-investment.client.tsx so both Wallet v2 and
 * the Lend page derive the same values from the same formula.
 *
 * @param lends   - Full lend orders slice (active + inactive)
 * @param poolSharePrice - Current pool share price (poolInfo.pool_share)
 */
export function computeLendingMarkToValue(
  lends: LendOrder[],
  poolSharePrice: number
): LendMarkToValue {
  const activeLends = lends.filter((order) => order.orderStatus === "LENDED");

  const activePrincipalSats = activeLends.reduce(
    (sum, order) => sum + order.value,
    0
  );

  let pendingRewardsSats = 0;

  if (poolSharePrice && activeLends.length > 0) {
    for (const order of activeLends) {
      if (!order.npoolshare || !order.value) continue;

      const rewards =
        poolSharePrice * (order.npoolshare / POOL_SHARE_DECIMALS_SCALE) -
        order.value;

      if (rewards >= 100 || rewards < 0) {
        pendingRewardsSats += rewards;
      }
      // positive dust < 100 sats is zeroed (no else branch needed)
    }
  }

  return {
    activePrincipalSats,
    pendingRewardsSats,
    markToValueSats: activePrincipalSats + pendingRewardsSats,
  };
}
