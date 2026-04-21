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

const PAGE_SIZE = 20;
const V2_ENABLED =
  process.env.NEXT_PUBLIC_DEPOSIT_WITHDRAW_V2 === "true";

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
};

export function useDepositFeed({
  twilightAddress,
  ephemeral = null,
  reserveMeta = null,
  enableStream = V2_ENABLED,
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
      const { page, pages } = lastPage.pagination;
      return page < pages ? page + 1 : undefined;
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

  const { active, history } = useMemo(() => {
    const blockHeight = currentBtcBlock ?? 0;
    const activeRows: DepositFeedRow[] = [];
    const historyRows: DepositFeedRow[] = [];

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
      const hasMatchingRow = indexerRows.some(
        (r) =>
          r.twilightDepositAddress === ephemeral.btcDepositAddress &&
          Number(r.depositAmount) === ephemeral.amountSats
      );
      if (!hasMatchingRow) {
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

    return { active: activeRows, history: historyRows };
  }, [indexerRows, ephemeral, reserveMeta, currentBtcBlock]);

  return {
    active,
    history,
    isLoading: accountQuery.isPending && historyQuery.isPending,
    error: historyQuery.error ?? accountQuery.error ?? null,
    hasMore: !!historyQuery.hasNextPage,
    loadMore: historyQuery.fetchNextPage,
    isLoadingMore: historyQuery.isFetchingNextPage,
  };
}
