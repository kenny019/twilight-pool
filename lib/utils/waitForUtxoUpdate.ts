import { queryUtxoForAddress } from "@/lib/api/zkos";
import { UtxoData } from "@/lib/types";

const DEFAULT_TIMEOUT_MS = 60_000;
const DEFAULT_POLL_INTERVAL_MS = 2_000;

type WaitResult =
  | { success: true }
  | { success: false; message: string };

/**
 * Polls queryUtxoForAddress until the UTXO for `address` has a different
 * txid than `previousTxid`, indicating that the on-chain UTXO store has
 * been updated after the most recent broadcastTradingTx call.
 *
 * We compare txids rather than output_index because output_index is just
 * the position within a transaction (almost always 0 for single-output
 * Dark transfers) and will be the same for the old and new UTXO.
 * txid is the unique transaction hash and changes with every new broadcast.
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
  options?: { timeoutMs?: number; pollIntervalMs?: number }
): Promise<WaitResult> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const pollIntervalMs = options?.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const result = await queryUtxoForAddress(address);

    if (hasUtxoData(result)) {
      const currentTxid = serializeTxid(result.txid);
      if (currentTxid !== previousTxid) {
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
