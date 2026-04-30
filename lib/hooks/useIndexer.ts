import { useQuery } from "@tanstack/react-query";
import type { DepositParams, WithdrawalParams } from "../api/indexer";
import {
  getIndexerDeposit,
  getIndexerDeposits,
  getIndexerWithdrawal,
  getIndexerWithdrawals,
  getIndexerAccount,
  getIndexerBridgeAnalytics,
  getIndexerBitcoinInfo,
  getIndexerTx,
} from "../api/indexer";

export function useIndexerDeposits(params?: DepositParams) {
  return useQuery({
    queryKey: ["indexer-deposits", params],
    queryFn: () => getIndexerDeposits(params),
    staleTime: 60_000,
  });
}

export function useIndexerDeposit(id?: number | string) {
  return useQuery({
    queryKey: ["indexer-deposit", id],
    queryFn: () => getIndexerDeposit(id!),
    enabled: id !== undefined && id !== null && id !== "",
    staleTime: 60_000,
  });
}

export function useIndexerWithdrawals(params?: WithdrawalParams) {
  return useQuery({
    queryKey: ["indexer-withdrawals", params],
    queryFn: () => getIndexerWithdrawals(params),
    staleTime: 60_000,
  });
}

export function useIndexerWithdrawal(id?: number | string) {
  return useQuery({
    queryKey: ["indexer-withdrawal", id],
    queryFn: () => getIndexerWithdrawal(id!),
    enabled: id !== undefined && id !== null && id !== "",
    staleTime: 60_000,
  });
}

export function useIndexerAccount(address?: string) {
  return useQuery({
    queryKey: ["indexer-account", address],
    queryFn: () => getIndexerAccount(address!),
    enabled: !!address,
    staleTime: 60_000,
  });
}

export function useIndexerBridgeAnalytics() {
  return useQuery({
    queryKey: ["indexer-bridge-analytics"],
    queryFn: getIndexerBridgeAnalytics,
    staleTime: 60_000,
  });
}

export function useIndexerBitcoinInfo() {
  return useQuery({
    queryKey: ["indexer-bitcoin-info"],
    queryFn: getIndexerBitcoinInfo,
    staleTime: 15_000,
    refetchInterval: 30_000,
    retry: 3,
  });
}

export function useIndexerTx(hash?: string) {
  return useQuery({
    queryKey: ["indexer-tx", hash],
    queryFn: () => getIndexerTx(hash!),
    enabled: !!hash,
    staleTime: 30_000,
  });
}
