"use client";

import { useEffect, useState } from "react";
import {
  detectInAppBrowser,
  getInAppWalletProvider,
} from "@/lib/wallets/detect";
import { buildChainInfo } from "@/lib/wallets/chain-info";
import { twilightTestnet, twilightTestnetAssets } from "@/lib/chaindata";
import { CHAIN_NAME } from "@/lib/constants/chain";
import { WalletEntry } from "@/lib/wallets/registry";
import Button from "@/components/button";
import NextImage from "@/components/next-image";
import {
  CheckCircle2,
  AlertCircle,
  Loader2,
  Copy,
  Check,
  Info,
} from "lucide-react";

type PageStatus =
  | "loading"
  | "idle"
  | "adding"
  | "success"
  | "already_added"
  | "error";

export default function AddChainPage() {
  const [status, setStatus] = useState<PageStatus>("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [wallet, setWallet] = useState<WalletEntry | null>(null);
  const [providerName, setProviderName] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const detected = detectInAppBrowser();
    const walletProvider = getInAppWalletProvider();

    if (!detected || !walletProvider) {
      setStatus("idle");
      return;
    }

    setWallet(detected);
    setProviderName(walletProvider.name);

    // Check if chain is already registered
    walletProvider.provider
      .getKey(CHAIN_NAME)
      .then(() => setStatus("already_added"))
      .catch(() => setStatus("idle"));
  }, []);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(t);
  }, [copied]);

  const handleAddChain = async () => {
    const walletProvider = getInAppWalletProvider();
    if (!walletProvider) {
      setErrorMsg("Wallet provider not found. Please try again.");
      setStatus("error");
      return;
    }

    setStatus("adding");
    setErrorMsg(null);

    try {
      const chainInfo = buildChainInfo(twilightTestnet, twilightTestnetAssets);
      await walletProvider.provider.experimentalSuggestChain(chainInfo);

      // Verify chain was added
      try {
        await walletProvider.provider.getKey(CHAIN_NAME);
      } catch {
        // getKey may fail if no account yet — chain can still be added successfully
      }

      setStatus("success");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to add chain";
      if (/reject/i.test(message)) {
        setErrorMsg(
          "You declined the chain addition. Tap the button to try again."
        );
      } else {
        setErrorMsg(message);
      }
      setStatus("error");
    }
  };

  const rpcEndpoint = twilightTestnet.apis?.rpc?.[0]?.address;
  const restEndpoint = twilightTestnet.apis?.rest?.[0]?.address;

  // Loading state
  if (status === "loading") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-accent/40" />
      </div>
    );
  }

  // Regular browser — not in a wallet's in-app browser
  if (!wallet) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-6 px-4 py-12 text-center">
        <div className="rounded-xl bg-primary/[0.06] p-4">
          <Info className="h-8 w-8 text-primary/40" />
        </div>
        <div>
          <h1 className="text-lg font-semibold">Add Twilight Chain</h1>
          <p className="mt-2 text-sm text-primary-accent">
            This page is designed to be opened inside a wallet app&apos;s
            built-in browser (Keplr, Leap, or Cosmostation).
          </p>
        </div>
        <div className="w-full rounded-lg border border-outline bg-background p-4">
          <p className="mb-2 text-xs font-medium text-primary-accent/60">
            How to use:
          </p>
          <ol className="space-y-2 text-left text-sm text-primary-accent">
            <li>1. Open your wallet app (Keplr, Leap, or Cosmostation)</li>
            <li>2. Navigate to the built-in browser</li>
            <li>3. Visit this URL:</li>
          </ol>
          <div className="mt-3 flex items-center gap-2 rounded-md border border-outline bg-primary/[0.03] px-3 py-2">
            <p className="font-mono min-w-0 flex-1 truncate text-xs">
              {typeof window !== "undefined"
                ? window.location.href
                : "/add-chain"}
            </p>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                setCopied(true);
              }}
              className="shrink-0 rounded p-1 text-primary-accent/50 transition-colors hover:bg-primary/[0.06] hover:text-primary-accent"
            >
              {copied ? (
                <Check className="text-green-500 h-3.5 w-3.5" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // In-app browser view
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-6 px-4 py-12 text-center">
      {/* Wallet header */}
      <div className="flex items-center gap-3">
        <div className="rounded-2xl bg-primary/[0.06] p-3">
          <NextImage
            src={wallet.logo}
            alt={wallet.name}
            width={40}
            height={40}
            className="rounded-lg"
          />
        </div>
        <div className="text-left">
          <h1 className="text-lg font-semibold">Add Twilight Chain</h1>
          <p className="text-xs text-primary-accent">to {providerName}</p>
        </div>
      </div>

      {/* Chain info card */}
      <div className="w-full rounded-lg border border-outline bg-background p-4">
        <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2.5 text-left text-sm">
          <span className="text-primary-accent/60">Chain Name</span>
          <span className="font-medium">
            {twilightTestnet.pretty_name ?? twilightTestnet.chain_name}
          </span>

          <span className="text-primary-accent/60">Chain ID</span>
          <span className="font-mono text-xs">{twilightTestnet.chain_id}</span>

          <span className="text-primary-accent/60">Bech32 Prefix</span>
          <span className="font-mono text-xs">
            {twilightTestnet.bech32_prefix}
          </span>

          {rpcEndpoint && (
            <>
              <span className="text-primary-accent/60">RPC</span>
              <span className="font-mono truncate text-xs">{rpcEndpoint}</span>
            </>
          )}

          {restEndpoint && (
            <>
              <span className="text-primary-accent/60">REST</span>
              <span className="font-mono truncate text-xs">{restEndpoint}</span>
            </>
          )}

          <span className="text-primary-accent/60">Tokens</span>
          <span className="text-xs">NYKS (gas), SATS (BTC-backed)</span>
        </div>
      </div>

      {/* Action area */}
      {status === "idle" && (
        <Button onClick={handleAddChain} className="w-full">
          Add Twilight Chain to {providerName}
        </Button>
      )}

      {status === "adding" && (
        <div className="flex items-center gap-2 text-sm text-primary-accent">
          <Loader2 className="h-4 w-4 animate-spin" />
          Adding chain...
        </div>
      )}

      {status === "success" && (
        <div className="flex flex-col items-center gap-3">
          <div className="bg-green-500/10 rounded-xl p-3">
            <CheckCircle2 className="text-green-500 h-7 w-7" />
          </div>
          <div>
            <p className="text-sm font-medium">Chain added successfully!</p>
            <p className="mt-1 text-xs text-primary-accent">
              You can now return to your browser and connect your wallet.
            </p>
          </div>
        </div>
      )}

      {status === "already_added" && (
        <div className="flex flex-col items-center gap-3">
          <div className="bg-green-500/10 rounded-xl p-3">
            <CheckCircle2 className="text-green-500 h-7 w-7" />
          </div>
          <div>
            <p className="text-sm font-medium">
              Twilight chain is already registered in {providerName}
            </p>
            <p className="mt-1 text-xs text-primary-accent">
              You can return to your browser and connect your wallet.
            </p>
          </div>
        </div>
      )}

      {status === "error" && (
        <div className="flex flex-col items-center gap-3">
          <div className="rounded-xl bg-red/10 p-3">
            <AlertCircle className="h-7 w-7 text-red" />
          </div>
          <p className="text-sm text-primary-accent">
            {errorMsg ?? "Something went wrong."}
          </p>
          <Button onClick={handleAddChain} size="small">
            Try Again
          </Button>
        </div>
      )}
    </div>
  );
}
