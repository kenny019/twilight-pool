"use client";

import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { getIndexerTx, type IndexerWithdrawal } from "../api/indexer";
import type { TxStatus, WithdrawalRestRow } from "../derivedStatus";

type Pair = {
  restRow: WithdrawalRestRow | null;
  indexerRow: IndexerWithdrawal | null;
};

export type FetchTarget = { identifier: string; hash: string };

/**
 * Pure helper: select pairs that need a tx-status query. Exposed for tests.
 *
 * Skip rules:
 * - No `txHash` on the REST row → nothing to query
 * - Indexer row already confirmed → terminal, query adds no info
 */
export function selectFetchTargets(pairs: Pair[]): FetchTarget[] {
  return pairs
    .filter((p) => !!p.restRow?.txHash && !p.indexerRow?.isConfirmed)
    .map((p) => ({
      identifier: String(
        p.restRow!.withdrawIdentifier ?? p.indexerRow?.withdrawIdentifier
      ),
      hash: p.restRow!.txHash as string,
    }));
}

/**
 * Fan out one `getIndexerTx` query per pair that has a Cosmos `txHash` and is
 * not yet settled on the indexer. Settled rows are terminal — re-querying
 * their tx adds no information.
 *
 * Returns a `Map<withdrawIdentifier, TxStatus>` consumable by
 * `useWithdrawalFeed({ txStatusByIdentifier })`.
 */
export default function useWithdrawalTxStatuses(
  pairs: Pair[]
): Map<string, TxStatus> {
  const targets = useMemo(() => selectFetchTargets(pairs), [pairs]);

  const queries = useQueries({
    queries: targets.map(({ hash }) => ({
      queryKey: ["indexer-tx", hash],
      queryFn: () => getIndexerTx(hash),
      staleTime: 30_000,
      retry: 1,
    })),
  });

  // `queries` is a fresh array every render, so memoizing on it never hits;
  // build the map directly. Cost is proportional to active in-flight rows.
  const map = new Map<string, TxStatus>();
  targets.forEach(({ identifier }, i) => {
    const q = queries[i];
    if (!q || q.isPending || q.error || !q.data) {
      map.set(identifier, null);
      return;
    }
    map.set(identifier, q.data.status);
  });
  return map;
}
