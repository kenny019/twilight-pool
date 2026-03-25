"use client";

import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/dialog";
import { useSignStatus } from "@/lib/providers/session";
import { useWallet } from "@cosmos-kit/react-lite";
import { AlertTriangle, Loader2, PenLine } from "lucide-react";

export default function SignRequestDialog() {
  const { status, mainWallet } = useWallet();
  const { signStatus, retrySign, skipSign } = useSignStatus();

  const walletName = mainWallet?.walletPrettyName ?? "your wallet";
  const isConnected = status === "Connected";
  const isOpen =
    isConnected && (signStatus === "pending" || signStatus === "rejected");

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent
        className="max-w-sm gap-0 p-0 [&>button:last-child]:hidden"
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        {signStatus === "pending" && <PendingView walletName={walletName} />}
        {signStatus === "rejected" && (
          <RejectedView onRetry={retrySign} onSkip={skipSign} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function PendingView({ walletName }: { walletName: string }) {
  return (
    <div className="flex flex-col items-center gap-4 px-6 py-8 text-center">
      <div className="rounded-xl bg-theme/10 p-3">
        <Loader2 className="h-7 w-7 animate-spin text-theme" />
      </div>
      <div>
        <DialogTitle className="text-base font-semibold">
          Approve in {walletName}
        </DialogTitle>
        <DialogDescription className="mt-2 text-sm text-primary-accent">
          Sign request sent to {walletName}. Verify Ownership: Confirm you are
          the owner of this wallet.
        </DialogDescription>
      </div>
    </div>
  );
}

function RejectedView({
  onRetry,
  onSkip,
}: {
  onRetry: () => void;
  onSkip: () => void;
}) {
  return (
    <>
      <div className="flex flex-col items-center gap-4 px-6 py-8 text-center">
        <div className="rounded-xl bg-yellow-500/10 p-3">
          <AlertTriangle className="h-7 w-7 text-yellow-500" />
        </div>
        <div>
          <DialogTitle className="text-base font-semibold">
            Signature Rejected
          </DialogTitle>
          <DialogDescription className="mt-2 text-sm text-primary-accent">
            Without this signature, trading, transfers, and ZK features will not
            work. You can still browse the platform.
          </DialogDescription>
        </div>
      </div>
      <div className="flex justify-end gap-3 border-t border-primary/20 px-6 py-4">
        <button
          className="rounded-md bg-button-secondary px-4 py-2 text-sm transition-colors hover:bg-button-secondary/80"
          onClick={onSkip}
        >
          Continue Without Signing
        </button>
        <button
          className="flex items-center gap-1.5 rounded-md bg-white px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-white/90"
          onClick={onRetry}
        >
          <PenLine className="h-3.5 w-3.5" />
          Sign
        </button>
      </div>
    </>
  );
}
