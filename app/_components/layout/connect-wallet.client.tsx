"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogTrigger } from "@/components/dialog";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/popover";
import Button from "@/components/button";
import { useWalletConnection } from "@/lib/hooks/useWalletConnection";
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
  const isActivelyConnecting =
    state.view === "connecting" ||
    state.view === "suggesting_chain" ||
    state.view === "qr";

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
            className="flex items-center gap-2 rounded-md border border-outline bg-background px-3 py-1.5 text-sm transition-colors hover:border-primary/40"
          >
            <Wallet className="h-4 w-4 text-primary-accent/60" />
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
        <Button size="small" className="w-[180px]">
          Connect Wallet
        </Button>
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
