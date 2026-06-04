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
} from "../derivedStatus";
import useBtcBlockHeight from "./useBtcBlockHeight";
import useWithdrawRequests from "./useWithdrawRequests";
import { useIndexerStream } from "./useIndexerStream";
import useWithdrawalTxStatuses from "./useWithdrawalTxStatuses";
import { useTwilightStore } from "../providers/store";
import {
  correlate,
  keyForPair,
  mergeRestRowsWithStore,
  type WithdrawalPair,
} from "./withdrawalCorrelation";
import { V2_ENABLED } from "../featureFlags";

const PAGE_SIZE = 20;

export type WithdrawalFeedRow = {
  key: string;
  restRow: WithdrawalRestRow | null;
  indexerRow: IndexerWithdrawal | null;
  status: DerivedStatus<WithdrawalStatusState>;
};

type Options = {
  twilightAddress?: string;
  enableStream?: boolean;
};

export function useWithdrawalFeed({
  twilightAddress,
  enableStream = V2_ENABLED,
}: Options) {
  const restQuery = useWithdrawRequests(twilightAddress);
  const storeWithdrawals = useTwilightStore(
    (state) => state.withdraw.withdrawals
  );

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
      const { page, totalPages } = lastPage.pagination;
      return page < totalPages ? page + 1 : undefined;
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

  // Merge the local store's tx_hash into rest rows so `useWithdrawalTxStatuses`
  // can fan out per-tx queries. See `mergeRestRowsWithStore` for the
  // correctness argument (chain-monotonic FIFO pairing).
  //
  // TODO: persist the chain-assigned `withdrawIdentifier` on each store
  // entry at broadcast time and match on that directly. Until then this
  // ordering is the strongest correctness guarantee available.
  const restRows = useMemo<WithdrawalRestRow[]>(
    () => mergeRestRowsWithStore(restQuery.data ?? [], storeWithdrawals),
    [restQuery.data, storeWithdrawals]
  );

  const pairs = useMemo<WithdrawalPair[]>(
    () => correlate(restRows, indexerRows),
    [restRows, indexerRows]
  );

  const txStatusByIdentifier = useWithdrawalTxStatuses(pairs);

  const { active, history } = useMemo(() => {
    const blockHeight = currentBtcBlock ?? 0;
    const activeRows: WithdrawalFeedRow[] = [];
    const historyRows: WithdrawalFeedRow[] = [];

    for (const pair of pairs) {
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
  }, [pairs, txStatusByIdentifier, currentBtcBlock]);

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
