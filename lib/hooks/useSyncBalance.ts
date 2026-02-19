import { useQuery } from "@tanstack/react-query";
import { useTwilightStore } from "../providers/store";
import { useWallet } from "@cosmos-kit/react-lite";
import { WalletStatus } from "@cosmos-kit/core";
import { useSessionStore } from "../providers/session";
import { getZkAccountBalance } from "../twilight/zk";
import { useMemo, useCallback } from "react";

export const useSyncBalance = () => {
  const zkAccounts = useTwilightStore((state) => state.zk.zkAccounts);
  const updateZkAccount = useTwilightStore((state) => state.zk.updateZkAccount);
  const privateKey = useSessionStore((state) => state.privateKey);
  const { status } = useWallet();

  // Filter accounts that need syncing upfront.
  // The master account (tag === "main") is excluded because its balance and
  // UTXO are exclusively managed by serialised queue operations.  Letting the
  // background poller overwrite it mid-flight would corrupt optimistic updates.
  const accountsToSync = useMemo(() => {
    return zkAccounts.filter(
      (account) =>
        account.isOnChain &&
        account.type !== "Memo" &&
        account.tag !== "main"
    );
  }, [zkAccounts]);

  // Create stable query key with proper dependencies
  const queryKey = useMemo(() => {
    return [
      "sync-balance",
      status,
      privateKey,
      accountsToSync.map((acc) => acc.address).sort(), // Stable array for caching
    ];
  }, [status, privateKey, accountsToSync]);

  // Batch update function to reduce re-renders
  const batchUpdateAccounts = useCallback(
    (updates: Array<{ address: string; account: any }>) => {
      // Use a single state update for all changes
      updates.forEach(({ address, account }) => {
        updateZkAccount(address, account);
      });
    },
    [updateZkAccount]
  );

  return useQuery({
    queryKey,
    queryFn: async () => {
      const startTime = performance.now();

      // Early return if no accounts to sync
      if (accountsToSync.length === 0) {
        return { success: true, updated: 0, duration: 0 };
      }

      // Parallel balance fetching with error isolation
      const balancePromises = accountsToSync.map(async (zkAccount) => {
        try {
          const balance = await getZkAccountBalance({
            zkAccountAddress: zkAccount.address,
            signature: privateKey,
          });

          return {
            success: true,
            account: zkAccount,
            balance: balance.value,
          };
        } catch (error) {
          console.error(
            `Error getting balance for ${zkAccount.address}:`,
            error
          );
          return {
            success: false,
            account: zkAccount,
            error,
          };
        }
      });

      // Wait for all balance checks to complete
      const results = await Promise.allSettled(balancePromises);

      // Collect all updates to batch them
      const accountUpdates: Array<{ address: string; account: any }> = [];
      let updatedCount = 0;
      let errorCount = 0;

      // Process results and collect updates
      for (const result of results) {
        if (result.status === "fulfilled" && result.value.success) {
          const { account, balance } = result.value;

          // Only update if balance actually changed
          if (balance !== undefined && balance !== account.value) {
            accountUpdates.push({
              address: account.address,
              account: { ...account, value: balance },
            });
            updatedCount++;
          }
        } else {
          errorCount++;
        }
      }

      // Batch update all accounts at once
      if (accountUpdates.length > 0) {
        batchUpdateAccounts(accountUpdates);
      }

      const duration = performance.now() - startTime;

      // Log performance metrics in development
      if (process.env.NODE_ENV === "development") {
        console.log(
          `Balance sync completed: ${updatedCount}/${
            accountsToSync.length
          } updated, ${errorCount} errors, ${duration.toFixed(2)}ms`
        );
      }

      return {
        success: true,
        updated: updatedCount,
        errors: errorCount,
        total: accountsToSync.length,
        duration,
      };
    },
    // Conditional execution - only run when conditions are met
    enabled:
      status === WalletStatus.Connected &&
      !!privateKey &&
      accountsToSync.length > 0,

    // Performance optimizations
    refetchInterval: 30000,
    staleTime: 25000, // Consider data stale after 25 seconds
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,

    // Error handling
    retry: (failureCount, error) => {
      // Don't retry more than 2 times for network errors
      if (failureCount >= 2) return false;
      // Don't retry for authentication errors
      if (
        error?.message?.includes("signature") ||
        error?.message?.includes("auth")
      ) {
        return false;
      }
      return true;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });
};
