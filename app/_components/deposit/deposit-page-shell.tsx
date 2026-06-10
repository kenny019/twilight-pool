"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Button from "@/components/button";
import InfoDisclosure from "@/components/info-disclosure";
import { Text } from "@/components/typography";
import { Plus } from "lucide-react";
import { useDepositFeed } from "@/lib/hooks/useDepositFeed";
import {
  readReserveSelection,
  type ReserveSelection,
} from "@/lib/depositReserveStorage";
import type { PendingDeposit, ReserveMeta } from "@/lib/derivedStatus";
import ActiveDepositCard from "./active-deposit-card";
import DepositHistoryList from "./deposit-history-list";
import DepositSheet from "./deposit-sheet";
import RegisterAddressPrompt from "./register-address-prompt";

type Props = {
  twilightAddress: string;
  registeredAddress: string;
  depositAmount: number;
  isConfirmed: boolean;
};

export default function DepositPageShell({
  twilightAddress,
  registeredAddress,
  depositAmount,
  isConfirmed,
}: Props) {
  const hasPending = !!registeredAddress && !isConfirmed && depositAmount > 0;

  // Capture once on first mount of a pending deposit so re-renders don't
  // produce a fresh `createdAt` (which would invalidate every memo downstream).
  const [createdAt] = useState(() => new Date().toISOString());

  // Hydrate the user's chosen reserve from storage. VerificationStep writes
  // the snapshot (address + unlock height + round) when the user picks a
  // reserve to send BTC to. We trust the snapshot rather than re-deriving
  // from the live reserve list, which can roll forward and either bump or
  // drop the user's reserve.
  const [reserveSelection, setReserveSelection] =
    useState<ReserveSelection | null>(null);
  const syncReserveSelection = useCallback(() => {
    if (!registeredAddress) return;
    setReserveSelection(readReserveSelection(registeredAddress));
  }, [registeredAddress]);
  useEffect(syncReserveSelection, [syncReserveSelection]);

  // VerificationStep (inside the sheet) writes the selection after this
  // shell has mounted, so re-read storage when the sheet closes — otherwise
  // the active card never learns the reserve address until a full reload.
  const [sheetOpen, setSheetOpen] = useState(false);
  const handleSheetOpenChange = (open: boolean) => {
    setSheetOpen(open);
    if (!open) syncReserveSelection();
  };
  const handleChooseReserve = () => setSheetOpen(true);

  const ephemeral = useMemo<PendingDeposit | null>(
    () =>
      hasPending
        ? {
            btcDepositAddress: registeredAddress,
            reserveAddress: reserveSelection?.address ?? "",
            amountSats: depositAmount,
            createdAt,
          }
        : null,
    [hasPending, registeredAddress, depositAmount, createdAt, reserveSelection]
  );

  const reserveMeta: ReserveMeta | null = useMemo(
    () =>
      reserveSelection
        ? { unlockHeight: reserveSelection.unlockHeight }
        : null,
    [reserveSelection]
  );

  const { active, history, hasMore, loadMore, isLoadingMore, isLoading } =
    useDepositFeed({
      twilightAddress,
      ephemeral,
      reserveMeta,
    });

  const queryClient = useQueryClient();

  if (!registeredAddress) {
    return (
      <div className="mx-auto my-6 w-full max-w-4xl px-4 sm:my-10 md:px-0">
        <RegisterAddressPrompt
          onRegistered={() => {
            queryClient.invalidateQueries({
              queryKey: ["btc-registration", twilightAddress],
            });
          }}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto my-6 flex w-full max-w-4xl flex-col gap-6 px-4 sm:my-10 md:px-0">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <Text heading="h1" className="text-2xl font-semibold sm:text-3xl">
            Deposit Bitcoin
          </Text>
          <Text className="text-sm text-primary-accent">
            Status updates automatically as your deposit moves through Bitcoin and
            Twilight.
          </Text>
        </div>
        <DepositSheet
          initialAddress={registeredAddress}
          initialAmountSats={depositAmount}
          isConfirmed={isConfirmed}
          open={sheetOpen}
          onOpenChange={handleSheetOpenChange}
          trigger={
            <Button variant="primary">
              <Plus className="h-4 w-4" />
              New deposit
            </Button>
          }
        />
      </header>

      <section className="flex flex-col gap-3">
        <Text heading="h2" className="text-sm font-semibold text-primary-accent">
          Active
        </Text>
        {active.length === 0 ? (
          <div className="rounded-lg border border-dashed bg-background px-4 py-6 text-center text-sm text-primary-accent">
            Ready for your next deposit. Tap <strong>New deposit</strong> to start.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {active.map((row) => (
              <ActiveDepositCard
                key={row.key}
                row={row}
                onChooseReserve={handleChooseReserve}
              />
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <Text heading="h2" className="text-sm font-semibold text-primary-accent">
          History
        </Text>
        <DepositHistoryList
          rows={history}
          hasMore={hasMore}
          onLoadMore={loadMore}
          isLoadingMore={isLoadingMore}
          isLoading={isLoading}
        />
      </section>

      <InfoDisclosure summary="How deposits work">
        <ul className="flex list-disc flex-col gap-2 pl-5">
          <li>
            Twilight rotates reserve addresses every ~144 Bitcoin blocks. Send
            to the active reserve only.
          </li>
          <li>
            Each reserve is a threshold-signature vault secured by the
            validator set.
          </li>
          <li>
            Once your transaction confirms, oracles credit your Twilight
            balance automatically.
          </li>
        </ul>
      </InfoDisclosure>
    </div>
  );
}
