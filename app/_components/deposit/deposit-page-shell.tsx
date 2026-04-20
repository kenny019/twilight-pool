"use client";

import React from "react";
import { useQueryClient } from "@tanstack/react-query";
import Button from "@/components/button";
import InfoDisclosure from "@/components/info-disclosure";
import { Text } from "@/components/typography";
import { Plus } from "lucide-react";
import { useDepositFeed } from "@/lib/hooks/useDepositFeed";
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

  const ephemeral: PendingDeposit | null = hasPending
    ? {
        btcDepositAddress: registeredAddress,
        reserveAddress: "",
        amountSats: depositAmount,
        createdAt: new Date().toISOString(),
      }
    : null;

  const reserveMeta: ReserveMeta | null = null;

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
          trigger={
            <Button className="flex items-center gap-2 bg-primary text-background hover:bg-primary/90">
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
              <ActiveDepositCard key={row.key} row={row} />
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
