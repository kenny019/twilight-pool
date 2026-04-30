import type { WithdrawRequest } from "../api/rest";
import type { IndexerWithdrawal } from "../api/indexer";
import type { WithdrawalRestRow } from "../derivedStatus";

type StoreWithdrawal = {
  tx_hash: string;
  created_at: number;
  amount: number;
  withdrawAddress?: string;
  reserveId?: number;
};

/**
 * Merge `tx_hash` from local store entries into REST rows. Tuple alone is
 * unsafe (a repeated `(amount, address, reserveId)` would let a newer REST
 * row inherit an older hash); we sort REST by chain-monotonic
 * `withdrawIdentifier` and store by submission `created_at`, then FIFO-pair
 * matches.
 */
export function mergeRestRowsWithStore(
  restData: WithdrawRequest[],
  storeWithdrawals: StoreWithdrawal[]
): WithdrawalRestRow[] {
  if (restData.length === 0) return restData;

  const sorted = [...restData].sort(
    (a, b) => Number(a.withdrawIdentifier) - Number(b.withdrawIdentifier)
  );

  if (storeWithdrawals.length === 0) return sorted;

  const unmatched = [...storeWithdrawals].sort(
    (a, b) => a.created_at - b.created_at
  );

  return sorted.map((row) => {
    const amount = parseInt(row.withdrawAmount);
    const idx = unmatched.findIndex(
      (sw) =>
        sw.amount === amount &&
        (sw.withdrawAddress === undefined ||
          sw.withdrawAddress === row.withdrawAddress) &&
        (sw.reserveId === undefined ||
          sw.reserveId === parseInt(row.withdrawReserveId))
    );
    if (idx === -1) return row;
    const match = unmatched.splice(idx, 1)[0];
    return { ...row, txHash: match.tx_hash };
  });
}

export type WithdrawalPair = {
  restRow: WithdrawalRestRow | null;
  indexerRow: IndexerWithdrawal | null;
};

export function keyForPair(pair: WithdrawalPair): string {
  if (pair.restRow) return `rest:${pair.restRow.withdrawIdentifier}`;
  if (pair.indexerRow) return `indexer:${pair.indexerRow.id}`;
  return "unknown";
}

export function correlate(
  restRows: WithdrawalRestRow[],
  indexerRows: IndexerWithdrawal[]
): WithdrawalPair[] {
  if (restRows.length === 0 && indexerRows.length === 0) return [];

  const remainingIndexer = [...indexerRows];
  const pairs: WithdrawalPair[] = [];

  // 1. Primary match: shared `withdrawIdentifier`. Both sides expose it.
  for (const rest of restRows) {
    const id = String(rest.withdrawIdentifier);
    const matchIdx = remainingIndexer.findIndex(
      (row) => String(row.withdrawIdentifier) === id
    );
    if (matchIdx >= 0) {
      const [indexerRow] = remainingIndexer.splice(matchIdx, 1);
      pairs.push({ restRow: rest, indexerRow });
    } else {
      pairs.push({ restRow: rest, indexerRow: null });
    }
  }

  // 2. Fall back to composite tuple for anomalies (REST missing identifier,
  //    indexer rows that predate the REST entry, etc.). Forward iteration
  //    preserves FIFO: the oldest unmatched REST row pairs with the oldest
  //    unmatched indexer row.
  for (let i = 0; i < pairs.length; i++) {
    const pair = pairs[i];
    if (pair.indexerRow || !pair.restRow) continue;
    const rest = pair.restRow;
    const matchIdx = remainingIndexer.findIndex(
      (row) =>
        row.withdrawAddress === rest.withdrawAddress &&
        String(row.withdrawReserveId) === String(rest.withdrawReserveId) &&
        String(row.withdrawAmount) === String(rest.withdrawAmount)
    );
    if (matchIdx >= 0) {
      const [indexerRow] = remainingIndexer.splice(matchIdx, 1);
      pairs[i] = { restRow: rest, indexerRow };
      if (process.env.NODE_ENV !== "production") {
        console.warn(
          "[withdrawal-feed] fell back to composite match for",
          rest.withdrawIdentifier
        );
      }
    }
  }

  // 3. Surface any orphan indexer rows (e.g. REST row pruned server-side).
  for (const indexerRow of remainingIndexer) {
    pairs.push({ restRow: null, indexerRow });
  }

  return pairs;
}
