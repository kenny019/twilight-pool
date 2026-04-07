import { useQuery } from "@tanstack/react-query";
import type { DepositParams, WithdrawalParams } from "../api/indexer";
import {
  getIndexerDeposits,
  getIndexerWithdrawals,
  getIndexerAccount,
  getIndexerBridgeAnalytics,
} from "../api/indexer";

export function useIndexerDeposits(params?: DepositParams) {
  return useQuery({
    queryKey: ["indexer-deposits", params],
    queryFn: () => getIndexerDeposits(params),
    staleTime: 30_000,
  });
}

export function useIndexerWithdrawals(params?: WithdrawalParams) {
  return useQuery({
    queryKey: ["indexer-withdrawals", params],
    queryFn: () => getIndexerWithdrawals(params),
    staleTime: 30_000,
  });
}

export function useIndexerAccount(address?: string) {
  return useQuery({
    queryKey: ["indexer-account", address],
    queryFn: () => getIndexerAccount(address!),
    enabled: !!address,
    staleTime: 30_000,
  });
}

export function useIndexerBridgeAnalytics() {
  return useQuery({
    queryKey: ["indexer-bridge-analytics"],
    queryFn: getIndexerBridgeAnalytics,
    staleTime: 60_000,
  });
}
