"use client";

import { useMemo } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import {
  getIndexerAccount,
  getIndexerDeposits,
  type IndexerDeposit,
} from "../api/indexer";
import {
  deriveDepositStatus,
  type DerivedStatus,
  type DepositStatusState,
  type PendingDeposit,
  type ReserveMeta,
} from "../derivedStatus";
import useBtcBlockHeight from "./useBtcBlockHeight";
import { useIndexerStream } from "./useIndexerStream";
import { V2_ENABLED } from "../featureFlags";

const PAGE_SIZE = 20;

export type DepositFeedRow = {
  key: string;
  indexerRow: IndexerDeposit | null;
  ephemeral: PendingDeposit | null;
  status: DerivedStatus<DepositStatusState>;
};

type Options = {
  twilightAddress?: string;
  ephemeral?: PendingDeposit | null;
  reserveMeta?: ReserveMeta | null;
  // Disable the WS subscription (e.g. legacy flag off).
  enableStream?: boolean;
  /** For intent-backed ephemerals: credited rows only match (suppress the
   * ephemeral) when created at/after this ISO timestamp, so an old deposit
   * of the same amount doesn't swallow a fresh intent. Unset → match any
   * row, preserving the chain-registration behavior. */
  ephemeralMatchedAfter?: string | null;
};

/** Does this indexer row represent the same deposit as the ephemeral row?
 * Despite the name, the indexer's `twilightDepositAddress` is the
 * depositor's twilight account address (twilight1…), not their registered
 * BTC address — so we match on the owning account, then amount + recency. */
export function ephemeralMatchesIndexerRow(
  row: IndexerDeposit,
  ephemeral: PendingDeposit,
  twilightAddress: string,
  matchedAfter?: string | null
): boolean {
  if (!twilightAddress || row.twilightDepositAddress !== twilightAddress)
    return false;
  if (Number(row.depositAmount) !== ephemeral.amountSats) return false;
  // When the user picked a reserve, a same-amount row sent to a different
  // reserve is a different deposit — don't let it swallow this one. Unset
  // (no selection yet) → amount + recency carry the match.
  if (ephemeral.reserveAddress && row.reserveAddress !== ephemeral.reserveAddress)
    return false;
  // An in-flight (unconfirmed) row is always this deposit; a credited row
  // only counts when it postdates the recency cutoff.
  if (!matchedAfter || !row.confirmed) return true;
  return new Date(row.createdAt).getTime() >= new Date(matchedAfter).getTime();
}

export function useDepositFeed({
  twilightAddress,
  ephemeral = null,
  reserveMeta = null,
  enableStream = V2_ENABLED,
  ephemeralMatchedAfter = null,
}: Options) {
  const accountQuery = useQuery({
    queryKey: ["indexer-account", twilightAddress],
    queryFn: () => getIndexerAccount(twilightAddress!),
    enabled: !!twilightAddress,
    // One-shot hydration — `historyQuery` + WS events drive ongoing updates.
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  const historyQuery = useInfiniteQuery({
    queryKey: ["indexer-deposits-infinite", twilightAddress],
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      getIndexerDeposits({
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

  useIndexerStream({ twilightAddress, enabled: enableStream && !!twilightAddress });

  const { data: currentBtcBlock } = useBtcBlockHeight();

  const indexerRows = useMemo<IndexerDeposit[]>(() => {
    const fromPages =
      historyQuery.data?.pages.flatMap((p) => p.data) ?? [];
    if (fromPages.length > 0) return fromPages;
    return accountQuery.data?.deposits ?? [];
  }, [historyQuery.data, accountQuery.data]);

  const { active, history, ephemeralMatched } = useMemo(() => {
    const blockHeight = currentBtcBlock ?? 0;
    const activeRows: DepositFeedRow[] = [];
    const historyRows: DepositFeedRow[] = [];
    let matched = false;

    for (const row of indexerRows) {
      const status = deriveDepositStatus(row, null, blockHeight, null);
      if (!status) continue;
      const entry: DepositFeedRow = {
        key: `indexer:${row.id}`,
        indexerRow: row,
        ephemeral: null,
        status,
      };
      if (status.state === "credited") historyRows.push(entry);
      else activeRows.push(entry);
    }

    if (ephemeral) {
      const account = twilightAddress ?? "";
      matched = indexerRows.some((r) =>
        ephemeralMatchesIndexerRow(r, ephemeral, account, ephemeralMatchedAfter)
      );
      if (!matched) {
        const status = deriveDepositStatus(
          null,
          ephemeral,
          blockHeight,
          reserveMeta ?? null
        );
        if (status) {
          activeRows.unshift({
            key: `ephemeral:${ephemeral.btcDepositAddress}`,
            indexerRow: null,
            ephemeral,
            status,
          });
        }
      }
    }

    return { active: activeRows, history: historyRows, ephemeralMatched: matched };
  }, [
    indexerRows,
    ephemeral,
    reserveMeta,
    currentBtcBlock,
    ephemeralMatchedAfter,
    twilightAddress,
  ]);

  return {
    active,
    history,
    /** True when an indexer row covers the ephemeral deposit — callers can
     * retire any client-side pending record. */
    ephemeralMatched,
    isLoading: accountQuery.isPending && historyQuery.isPending,
    error: historyQuery.error ?? accountQuery.error ?? null,
    hasMore: !!historyQuery.hasNextPage,
    loadMore: historyQuery.fetchNextPage,
    isLoadingMore: historyQuery.isFetchingNextPage,
  };
}
