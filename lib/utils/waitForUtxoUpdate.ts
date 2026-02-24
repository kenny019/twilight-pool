import { queryUtxoForAddress } from "@/lib/api/zkos";
import { UtxoData } from "@/lib/types";

const DEFAULT_TIMEOUT_MS = 60_000;
const DEFAULT_POLL_INTERVAL_MS = 1_000;
/** Minimum wait before returning success. Relayer/chain UTXO availability ~5–6s. */
const DEFAULT_MIN_WAIT_MS = 5_000;

type WaitResult =
  | { success: true }
  | { success: false; message: string };

/**
 * Polls queryUtxoForAddress until the UTXO for `address` has a different
 * txid than `previousTxid`, indicating that the on-chain UTXO store has
 * been updated after the most recent broadcastTradingTx call.
 *
 * Enforces a minimum wait (default 5s) so the oracle/chain has time to
 * reflect the new state before the next task runs. This prevents UTXO
 * double-spend races when multiple merges run in quick succession.
 *
 * Typical usage — inside a masterAccountQueue task, after broadcastTradingTx:
 *
 *   const utxo = await queryUtxoForAddress(masterAccount.address);
 *   const previousTxid = hasUtxoData(utxo) ? serializeTxid(utxo.txid) : "";
 *
 *   await broadcastTradingTx(txHex);
 *
 *   const waited = await waitForUtxoUpdate(masterAccount.address, previousTxid);
 *   if (!waited.success) { ... handle timeout ... }
 */
export async function waitForUtxoUpdate(
  address: string,
  previousTxid: string,
  options?: {
    timeoutMs?: number;
    pollIntervalMs?: number;
    minWaitMs?: number;
  }
): Promise<WaitResult> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const pollIntervalMs = options?.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
  const minWaitMs = options?.minWaitMs ?? DEFAULT_MIN_WAIT_MS;
  const deadline = Date.now() + timeoutMs;
  const minWaitDeadline = Date.now() + minWaitMs;

  while (Date.now() < deadline) {
    const result = await queryUtxoForAddress(address);

    if (hasUtxoData(result)) {
      const currentTxid = serializeTxid(result.txid);
      if (currentTxid !== previousTxid && Date.now() >= minWaitDeadline) {
        return { success: true };
      }
    }

    await sleep(pollIntervalMs);
  }

  return {
    success: false,
    message: `UTXO for address ${address.slice(0, 12)}… did not update within ${timeoutMs}ms`,
  };
}

/**
 * Serialise a txid byte-array to a stable string for comparison.
 * JSON.stringify([1,2,3]) === JSON.stringify([1,2,3]) always holds,
 * unlike referential equality on arrays.
 */
export function serializeTxid(txid: number[]): string {
  return JSON.stringify(txid);
}

/**
 * Type-guard: checks whether a queryUtxoForAddress result contains real
 * UtxoData (vs the empty Record<string, never> returned on failure).
 */
export function hasUtxoData(
  result: Record<string, never> | UtxoData
): result is UtxoData {
  return Object.hasOwn(result, "txid");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
