"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/dialog";
import { useTwilightStore, useIsStoreHydrated } from "@/lib/providers/store";
import { useSignStatus } from "@/lib/providers/session";
import { useWallet } from "@cosmos-kit/react-lite";

const LeaderboardOptInDialog = () => {
  const { status } = useWallet();
  const hasShownOptInDialog = useTwilightStore(
    (state) => state.hasShownOptInDialog
  );
  const setOptInLeaderboard = useTwilightStore(
    (state) => state.setOptInLeaderboard
  );
  const setHasShownOptInDialog = useTwilightStore(
    (state) => state.setHasShownOptInDialog
  );

  const isHydrated = useIsStoreHydrated();
  const { signStatus } = useSignStatus();

  // Wait until sign request resolves (signed or skipped) before showing,
  // so the leaderboard dialog doesn't overlap the Keplr sign popup
  const signDone = signStatus === "signed" || signStatus === "skipped";
  const isOpen =
    isHydrated && status === "Connected" && signDone && !hasShownOptInDialog;

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent
        className="gap-0 p-0 [&>button:last-child]:hidden"
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <div className="flex flex-col gap-2 px-6 py-5">
          <DialogTitle>Leaderboard Participation</DialogTitle>
          <DialogDescription>
            Opt in to have your trades tracked on-chain for leaderboard
            rankings. You can change this anytime in settings.
          </DialogDescription>
        </div>
        <div className="flex justify-end gap-3 border-t border-primary/20 px-6 py-4">
          <button
            className="rounded-md bg-button-secondary px-4 py-2 text-sm transition-colors hover:bg-button-secondary/80"
            onClick={() => {
              setHasShownOptInDialog(true);
            }}
          >
            No Thanks
          </button>
          <button
            className="rounded-md bg-white px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-white/90"
            onClick={() => {
              setOptInLeaderboard(true);
              setHasShownOptInDialog(true);
            }}
          >
            Opt In
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LeaderboardOptInDialog;
