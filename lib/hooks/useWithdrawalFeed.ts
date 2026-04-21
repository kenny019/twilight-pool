"use client";

import { useMemo } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import {
  getIndexerAccount,
  getIndexerWithdrawals,
  type IndexerWithdrawal,
} from "../api/indexer";
import {
  deriveWithdrawalStatus,
  type DerivedStatus,
  type WithdrawalStatusState,
  type WithdrawalRestRow,
  type TxStatus,
} from "../derivedStatus";
import useBtcBlockHeight from "./useBtcBlockHeight";
import useWithdrawRequests from "./useWithdrawRequests";
import { useIndexerStream } from "./useIndexerStream";

const PAGE_SIZE = 20;
const V2_ENABLED =
  process.env.NEXT_PUBLIC_DEPOSIT_WITHDRAW_V2 === "true";

export type WithdrawalFeedRow = {
  key: string;
  restRow: WithdrawalRestRow | null;
  indexerRow: IndexerWithdrawal | null;
  status: DerivedStatus<WithdrawalStatusState>;
};

type Options = {
  twilightAddress?: string;
  /**
   * Optional map of tx status keyed by `withdrawIdentifier`. Allows the caller
   * to supply precomputed tx-failure info from `/api/txs/:hash` without
   * forcing this hook to fan out one tx query per request.
   */
  txStatusByIdentifier?: Map<string, TxStatus>;
  enableStream?: boolean;
};

export function useWithdrawalFeed({
  twilightAddress,
  txStatusByIdentifier,
  enableStream = V2_ENABLED,
}: Options) {
  const restQuery = useWithdrawRequests(twilightAddress);

  const accountQuery = useQuery({
    queryKey: ["indexer-account", twilightAddress],
    queryFn: () => getIndexerAccount(twilightAddress!),
    enabled: !!twilightAddress,
    // One-shot hydration — `historyQuery` + WS events drive ongoing updates.
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  const historyQuery = useInfiniteQuery({
    queryKey: ["indexer-withdrawals-infinite", twilightAddress],
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      getIndexerWithdrawals({
        address: twilightAddress,
        page: pageParam as number,
        limit: PAGE_SIZE,
      }),
    getNextPageParam: (lastPage) => {
      const { page, pages } = lastPage.pagination;
      return page < pages ? page + 1 : undefined;
    },
    enabled: !!twilightAddress,
    staleTime: 60_000,
  });

  useIndexerStream({
    twilightAddress,
    enabled: enableStream && !!twilightAddress,
  });

  const { data: currentBtcBlock } = useBtcBlockHeight();

  const indexerRows = useMemo<IndexerWithdrawal[]>(() => {
    const fromPages =
      historyQuery.data?.pages.flatMap((p) => p.data) ?? [];
    if (fromPages.length > 0) return fromPages;
    return accountQuery.data?.withdrawals ?? [];
  }, [historyQuery.data, accountQuery.data]);

  const { active, history } = useMemo(() => {
    const blockHeight = currentBtcBlock ?? 0;
    const restRows: WithdrawalRestRow[] = restQuery.data ?? [];

    const correlated = correlate(restRows, indexerRows);

    const activeRows: WithdrawalFeedRow[] = [];
    const historyRows: WithdrawalFeedRow[] = [];

    for (const pair of correlated) {
      const identifier = pair.restRow
        ? String(pair.restRow.withdrawIdentifier)
        : pair.indexerRow
        ? String(pair.indexerRow.withdrawIdentifier)
        : "";
      const txStatus = txStatusByIdentifier?.get(identifier) ?? null;
      const status = deriveWithdrawalStatus(
        pair.restRow,
        pair.indexerRow,
        txStatus,
        blockHeight
      );
      if (!status) continue;

      const entry: WithdrawalFeedRow = {
        key: keyForPair(pair),
        restRow: pair.restRow,
        indexerRow: pair.indexerRow,
        status,
      };
      if (status.state === "settled" || status.state === "failed") {
        historyRows.push(entry);
      } else {
        activeRows.push(entry);
      }
    }

    return { active: activeRows, history: historyRows };
  }, [restQuery.data, indexerRows, txStatusByIdentifier, currentBtcBlock]);

  return {
    active,
    history,
    isLoading: restQuery.isPending || historyQuery.isPending,
    error: restQuery.error ?? historyQuery.error ?? accountQuery.error ?? null,
    hasMore: !!historyQuery.hasNextPage,
    loadMore: historyQuery.fetchNextPage,
    isLoadingMore: historyQuery.isFetchingNextPage,
  };
}

type Pair = {
  restRow: WithdrawalRestRow | null;
  indexerRow: IndexerWithdrawal | null;
};

function keyForPair(pair: Pair): string {
  if (pair.restRow) return `rest:${pair.restRow.withdrawIdentifier}`;
  if (pair.indexerRow) return `indexer:${pair.indexerRow.id}`;
  return "unknown";
}

export function correlate(
  restRows: WithdrawalRestRow[],
  indexerRows: IndexerWithdrawal[]
): Pair[] {
  if (restRows.length === 0 && indexerRows.length === 0) return [];

  const remainingIndexer = [...indexerRows];
  const pairs: Pair[] = [];

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
