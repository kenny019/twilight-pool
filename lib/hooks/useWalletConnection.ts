"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useManager, useWallet } from "@cosmos-kit/react-lite";
import { CHAIN_NAME } from "@/lib/constants/chain";
import { WalletEntry, WALLET_REGISTRY } from "@/lib/wallets/registry";
import { WalletErrorType, classifyWalletError } from "@/lib/wallets/errors";
import { connectWithTimeout } from "@/lib/wallets/connect-with-timeout";
import {
  getInAppWalletProvider,
  type RawWalletObject,
} from "@/lib/wallets/detect";
import { buildChainInfo } from "@/lib/wallets/chain-info";
import { twilightTestnet, twilightTestnetAssets } from "@/lib/chaindata";
import { useTwilight } from "@/lib/providers/twilight";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ConnectionState =
  | { view: "idle" }
  | { view: "suggesting_chain"; wallet: WalletEntry }
  | { view: "connecting"; wallet: WalletEntry }
  | { view: "qr"; wallet: WalletEntry; qrUri: string }
  | { view: "error"; wallet: WalletEntry; errorType: WalletErrorType }
  | { view: "not_installed"; wallet: WalletEntry };

export function isActiveView(state: ConnectionState): boolean {
  return (
    state.view === "connecting" ||
    state.view === "suggesting_chain" ||
    state.view === "qr"
  );
}

export interface UseWalletConnectionReturn {
  state: ConnectionState;
  connect: (wallet: WalletEntry) => Promise<void>;
  disconnect: () => Promise<void>;
  retry: () => Promise<void>;
  reset: () => void;
  address: string | undefined;
  isConnected: boolean;
}

type WalletWithAddress = {
  address?: string;
};

async function waitForWalletAddress(
  wallet: WalletWithAddress,
  timeoutMs = 2_000
): Promise<boolean> {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (wallet.address) return true;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  return !!wallet.address;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useWalletConnection(): UseWalletConnectionReturn {
  const { status, mainWallet } = useWallet();
  const { getWalletRepo } = useManager();
  const { hasInit, setHasInit } = useTwilight();

  const [state, setState] = useState<ConnectionState>({ view: "idle" });
  const lastWalletRef = useRef<WalletEntry | null>(null);
  const qrPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Tracks active connection to prevent auto-reset/auto-close from stale state
  const connectingRef = useRef(false);
  // Tracks explicit disconnect to override stale cosmos-kit state
  // (e.g. when extension is disabled and disconnect() can't clear internal state)
  const forceDisconnectedRef = useRef(false);

  // Derived state
  const isConnected = status === "Connected" && !forceDisconnectedRef.current;
  const chainWallet = mainWallet?.getChainWallet(CHAIN_NAME);
  const address = isConnected ? chainWallet?.address : undefined;

  // Clean up QR polling on unmount
  useEffect(() => {
    return () => {
      if (qrPollRef.current) clearInterval(qrPollRef.current);
    };
  }, []);

  // Auto-disconnect stale mobile wallet sessions on page refresh.
  // WalletConnect sessions don't survive refresh, so cosmos-kit reports
  // a false "Connected" with a cached address. Detect and disconnect once.
  const hasCheckedStaleRef = useRef(false);
  useEffect(() => {
    if (hasCheckedStaleRef.current) return;
    if (!mainWallet || status !== "Connected") return;

    hasCheckedStaleRef.current = true;

    const walletName = mainWallet.walletName;
    const isMobileWallet = WALLET_REGISTRY.some(
      (w) => w.id === walletName && w.platform === "mobile"
    );

    if (isMobileWallet) {
      mainWallet
        .disconnect(false, { walletconnect: { removeAllPairings: true } })
        .catch((err) =>
          console.error("Failed to disconnect stale mobile session:", err)
        );
    }
  }, [mainWallet, status]);

  // Auto-reset to idle when connection fully succeeds (status + address)
  // Skip if a connect() call is actively in-flight (prevents stale state from closing modal)
  useEffect(() => {
    if (
      isConnected &&
      address &&
      state.view !== "idle" &&
      !connectingRef.current
    ) {
      setState({ view: "idle" });
    }
  }, [isConnected, address, state.view]);

  // ------------------------------------------
  // Connect
  // ------------------------------------------
  const connect = useCallback(
    async (wallet: WalletEntry) => {
      // Cancel any in-flight connection (QR poll, etc.)
      if (qrPollRef.current) {
        clearInterval(qrPollRef.current);
        qrPollRef.current = null;
      }

      connectingRef.current = true;
      lastWalletRef.current = wallet;

      // Mark first-time initialization
      if (!hasInit) {
        setHasInit("true");
      }

      // Get the chain wallet for this specific wallet provider
      let walletRepo;
      try {
        walletRepo = getWalletRepo(CHAIN_NAME);
      } catch {
        connectingRef.current = false;
        setState({
          view: "error",
          wallet,
          errorType: "unknown",
        });
        return;
      }

      const targetChainWallet = walletRepo.getWallet(wallet.id);

      if (!targetChainWallet) {
        connectingRef.current = false;
        setState({ view: "not_installed", wallet });
        return;
      }

      forceDisconnectedRef.current = false;

      try {
        // In-app browser: suggest chain before connecting so the wallet knows about it
        const inAppProvider = getInAppWalletProvider();
        if (inAppProvider) {
          setState({ view: "suggesting_chain", wallet });
          try {
            const chainInfo = buildChainInfo(
              twilightTestnet,
              twilightTestnetAssets
            );
            await inAppProvider.provider.experimentalSuggestChain(chainInfo);
            await inAppProvider.provider.enable(CHAIN_NAME);
          } catch (suggestErr) {
            // If user rejects suggestion, treat as rejection error
            const errType = classifyWalletError(suggestErr);
            if (errType === "rejected") {
              setState({ view: "error", wallet, errorType: "rejected" });
              return;
            }
            // Otherwise continue — chain may already exist
          }
        } else if (wallet.windowKey) {
          // Desktop extension: suggest chain directly via window object
          const ext = (
            window as unknown as Record<string, RawWalletObject | undefined>
          )[wallet.windowKey];
          if (ext?.experimentalSuggestChain) {
            setState({ view: "suggesting_chain", wallet });
            try {
              const chainInfo = buildChainInfo(
                twilightTestnet,
                twilightTestnetAssets
              );
              await ext.experimentalSuggestChain(chainInfo);
            } catch (suggestErr) {
              const errType = classifyWalletError(suggestErr);
              if (errType === "rejected") {
                setState({ view: "error", wallet, errorType: "rejected" });
                return;
              }
              // Otherwise continue — chain may already exist
            }
          }
        }

        setState({ view: "connecting", wallet });

        if (wallet.platform === "mobile") {
          // For mobile wallets, start connect and poll for QR URI
          const connectPromise = connectWithTimeout(
            () => targetChainWallet.connect(true),
            30_000 // longer timeout for mobile/QR flow
          );

          // Poll for QR URL while connecting
          qrPollRef.current = setInterval(() => {
            const qrData = targetChainWallet.qrUrl;
            if (qrData?.data) {
              setState((prev) => {
                if (prev.view === "connecting" || prev.view === "qr") {
                  return { view: "qr", wallet, qrUri: qrData.data! };
                }
                return prev;
              });
            }
          }, 200);

          await connectPromise;

          if (qrPollRef.current) {
            clearInterval(qrPollRef.current);
            qrPollRef.current = null;
          }
        } else {
          // Extension or snap — straightforward connect
          await connectWithTimeout(() => targetChainWallet.connect(true));
        }

        // Cosmos Kit can resolve connect() before the address is hydrated.
        // Give it a brief window before deciding the connection failed.
        const hasAddress = await waitForWalletAddress(targetChainWallet);

        if (!hasAddress) {
          setState({ view: "error", wallet, errorType: "timeout" });
          return;
        }

        // Success — state will auto-reset via the useEffect above
      } catch (err) {
        if (qrPollRef.current) {
          clearInterval(qrPollRef.current);
          qrPollRef.current = null;
        }

        const errorType = classifyWalletError(err);

        if (errorType === "not_installed") {
          setState({ view: "not_installed", wallet });
        } else {
          setState({ view: "error", wallet, errorType });
        }
      } finally {
        connectingRef.current = false;
      }
    },
    [getWalletRepo, hasInit, setHasInit]
  );

  // ------------------------------------------
  // Disconnect
  // ------------------------------------------
  const disconnect = useCallback(async () => {
    forceDisconnectedRef.current = true;
    try {
      await mainWallet?.disconnect(false, {
        walletconnect: { removeAllPairings: true },
      });
    } catch (err) {
      // Extension may be disabled/removed — disconnect fails but we still
      // want the UI to reflect disconnected state (handled by forceDisconnectedRef)
      console.error("Failed to disconnect:", err);
    }
    setState({ view: "idle" });
    lastWalletRef.current = null;
  }, [mainWallet]);

  // ------------------------------------------
  // Retry (re-connect with last wallet)
  // ------------------------------------------
  const retry = useCallback(async () => {
    if (lastWalletRef.current) {
      await connect(lastWalletRef.current);
    }
  }, [connect]);

  // ------------------------------------------
  // Reset (back to idle)
  // ------------------------------------------
  const reset = useCallback(() => {
    if (qrPollRef.current) {
      clearInterval(qrPollRef.current);
      qrPollRef.current = null;
    }
    setState({ view: "idle" });
  }, []);

  return {
    state,
    connect,
    disconnect,
    retry,
    reset,
    address,
    isConnected,
  };
}
