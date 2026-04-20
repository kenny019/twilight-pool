"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogTrigger } from "@/components/dialog";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/popover";

import {
  useWalletConnection,
  isActiveView,
} from "@/lib/hooks/useWalletConnection";
import { truncateAddress } from "@/lib/utils/address";
import WalletModal from "./wallet-modal/wallet-modal.client";
import { Check, Copy, LogOut, Wallet } from "lucide-react";

export default function ConnectWallet() {
  const { state, connect, disconnect, retry, reset, address, isConnected } =
    useWalletConnection();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Auto-close modal only when fully connected (address resolved)
  // Skip if a connection flow is actively in progress (prevents stale state from closing modal)
  const isActivelyConnecting = isActiveView(state);

  useEffect(() => {
    if (isConnected && address && dialogOpen && !isActivelyConnecting) {
      setDialogOpen(false);
    }
  }, [isConnected, address, dialogOpen, isActivelyConnecting]);

  // Reset connection state when dialog closes (but not on initial mount)
  useEffect(() => {
    if (!dialogOpen) {
      reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dialogOpen]);

  // Reset copy icon after 2s
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(t);
  }, [copied]);

  if (isConnected && address) {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex min-h-[40px] items-center gap-2 rounded-md border border-theme/30 bg-theme/5 px-3 py-1.5 text-sm transition-colors hover:border-theme/50 hover:bg-theme/10 max-md:min-h-[36px] max-md:gap-1.5 max-md:px-2.5 max-md:py-1"
          >
            <Wallet className="h-4 w-4 text-theme/60" />
            <span className="font-mono text-xs">
              {truncateAddress(address)}
            </span>
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-64 p-0">
          {/* Address section */}
          <div className="border-border/50 border-b p-3">
            <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-primary-accent/50">
              Connected
            </p>
            <div className="flex items-center gap-2">
              <p className="font-mono min-w-0 flex-1 truncate text-xs">
                {address}
              </p>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(address);
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

          {/* Disconnect */}
          <div className="p-2">
            <button
              type="button"
              onClick={() => disconnect()}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-red transition-colors hover:bg-red/10"
            >
              <LogOut className="h-4 w-4" />
              Disconnect
            </button>
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-md border border-theme/60 bg-theme/20 px-3 py-1.5 text-xs font-medium text-theme transition-colors duration-200 hover:border-theme/80 hover:bg-theme/40 hover:shadow-[0_0_15px_rgba(var(--theme-rgb),0.2)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary max-md:min-h-[38px] max-md:px-3 max-md:text-xs"
        >
          <Wallet className="h-3 w-3 shrink-0" />
          <span>Connect Wallet</span>
        </button>
      </DialogTrigger>
      <WalletModal
        state={state}
        connect={connect}
        retry={retry}
        reset={reset}
      />
    </Dialog>
  );
}
