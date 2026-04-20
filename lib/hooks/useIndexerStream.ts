"use client";

import { useEffect } from "react";
import {
  useQueryClient,
  QueryClient,
  type InfiniteData,
} from "@tanstack/react-query";
import { IndexerWsClient, type IndexerEvent } from "../indexer/ws";
import type {
  IndexerAccount,
  IndexerDeposit,
  IndexerWithdrawal,
} from "../api/indexer";

type Options = {
  twilightAddress?: string;
  enabled?: boolean;
};

type BtcInfoShape = {
  blockHeight: number;
  feeEstimate?: unknown;
};

type IndexerPage<T> = { data: T[]; pagination: unknown };

export function useIndexerStream({
  twilightAddress,
  enabled = true,
}: Options) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) return;
    const client = new IndexerWsClient();
    const unsubscribe = client.subscribe((event) =>
      handleEvent(event, twilightAddress, queryClient)
    );
    client.connect();

    return () => {
      unsubscribe();
      client.close();
    };
  }, [enabled, twilightAddress, queryClient]);
}

function handleEvent(
  event: IndexerEvent,
  twilightAddress: string | undefined,
  queryClient: QueryClient
) {
  if (event.type === "block:new") {
    // `useBtcBlockHeight` owns this cache key and then `.select`s blockHeight.
    queryClient.setQueryData<BtcInfoShape>(["bitcoin-info"], (prev) => {
      if (!prev) return prev;
      return { ...prev, blockHeight: event.payload.blockHeight };
    });
    return;
  }

  if (event.type === "deposit:new") {
    const row = event.payload;
    if (twilightAddress && row.twilightDepositAddress !== twilightAddress) {
      return;
    }
    mergeDeposit(queryClient, row, twilightAddress);
    return;
  }

  if (event.type === "withdrawal:new") {
    const row = event.payload;
    if (twilightAddress && row.twilightAddress !== twilightAddress) return;
    mergeWithdrawal(queryClient, row, twilightAddress);
  }
}

function mergeInfiniteFirstPage<T extends { id: number }>(
  queryClient: QueryClient,
  queryKey: readonly unknown[],
  row: T
) {
  queryClient.setQueriesData<InfiniteData<IndexerPage<T>, number>>(
    { queryKey },
    (prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        pages: prev.pages.map((page, idx) => {
          if (idx !== 0) return page;
          const existingIdx = page.data.findIndex((r) => r.id === row.id);
          const next =
            existingIdx >= 0
              ? page.data.map((r, i) =>
                  i === existingIdx ? { ...r, ...row } : r
                )
              : [row, ...page.data];
          return { ...page, data: next };
        }),
      };
    }
  );
}

function mergeDeposit(
  queryClient: QueryClient,
  row: IndexerDeposit,
  twilightAddress: string | undefined
) {
  mergeInfiniteFirstPage<IndexerDeposit>(
    queryClient,
    ["indexer-deposits-infinite", twilightAddress],
    row
  );

  queryClient.setQueryData<IndexerAccount>(
    ["indexer-account", twilightAddress],
    (prev) => {
      if (!prev) return prev;
      const existingIdx = prev.deposits.findIndex((d) => d.id === row.id);
      const deposits =
        existingIdx >= 0
          ? prev.deposits.map((d, i) =>
              i === existingIdx ? { ...d, ...row } : d
            )
          : [row, ...prev.deposits];
      return { ...prev, deposits };
    }
  );
}

function mergeWithdrawal(
  queryClient: QueryClient,
  row: IndexerWithdrawal,
  twilightAddress: string | undefined
) {
  mergeInfiniteFirstPage<IndexerWithdrawal>(
    queryClient,
    ["indexer-withdrawals-infinite", twilightAddress],
    row
  );

  queryClient.setQueryData<IndexerAccount>(
    ["indexer-account", twilightAddress],
    (prev) => {
      if (!prev) return prev;
      const existingIdx = prev.withdrawals.findIndex((w) => w.id === row.id);
      const withdrawals =
        existingIdx >= 0
          ? prev.withdrawals.map((w, i) =>
              i === existingIdx ? { ...w, ...row } : w
            )
          : [row, ...prev.withdrawals];
      return { ...prev, withdrawals };
    }
  );
}
