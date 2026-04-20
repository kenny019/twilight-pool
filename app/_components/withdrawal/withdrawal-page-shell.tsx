"use client";

import React from "react";
import Button from "@/components/button";
import InfoDisclosure from "@/components/info-disclosure";
import { Text } from "@/components/typography";
import { Plus } from "lucide-react";
import BTC from "@/lib/twilight/denoms";
import Big from "big.js";
import { useWithdrawalFeed } from "@/lib/hooks/useWithdrawalFeed";
import useGetRegisteredBTCAddress from "@/lib/hooks/useGetRegisteredBtcAddress";
import useGetTwilightBTCBalance from "@/lib/hooks/useGetTwilightBtcBalance";
import { truncateHash } from "@/lib/helpers";
import ActiveWithdrawalsPanel from "./active-withdrawals-panel";
import WithdrawalHistoryList from "./withdrawal-history-list";
import WithdrawalSheet from "./withdrawal-sheet";

type Props = {
  twilightAddress: string;
};

export default function WithdrawalPageShell({ twilightAddress }: Props) {
  const { active, history, hasMore, loadMore, isLoadingMore, isLoading } =
    useWithdrawalFeed({ twilightAddress });

  const { twilightSats } = useGetTwilightBTCBalance();
  const { data: registered } = useGetRegisteredBTCAddress(twilightAddress);

  const balanceBtc = new BTC("sats", Big(twilightSats || 0))
    .convert("BTC")
    .toString();

  return (
    <div className="mx-auto my-6 flex w-full max-w-4xl flex-col gap-6 px-4 sm:my-10 md:px-0">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-1">
          <Text heading="h1" className="text-2xl font-semibold sm:text-3xl">
            Withdraw Bitcoin
          </Text>
          <Text className="text-sm text-primary-accent">
            Paid out to the BTC address you registered for deposits.
          </Text>
        </div>
        <WithdrawalSheet
          trigger={
            <Button className="flex items-center gap-2 bg-primary text-background hover:bg-primary/90">
              <Plus className="h-4 w-4" />
              New withdrawal
            </Button>
          }
        />
      </header>

      <section className="flex flex-col gap-1 rounded-lg border bg-background p-5">
        <Text className="text-[11px] font-medium uppercase tracking-wider text-primary-accent/70">
          Available balance
        </Text>
        <div className="flex items-baseline gap-2">
          <Text heading="h2" className="font-mono text-3xl font-semibold sm:text-4xl">
            {balanceBtc}
          </Text>
          <Text className="text-sm text-primary-accent">BTC</Text>
        </div>
        {registered?.depositAddress && (
          <Text className="mt-1 font-mono text-[11px] text-primary-accent">
            Payout address {truncateHash(registered.depositAddress, 8, 8)}
          </Text>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <Text heading="h2" className="text-sm font-semibold text-primary-accent">
          Active
        </Text>
        <ActiveWithdrawalsPanel rows={active} />
      </section>

      <section className="flex flex-col gap-3">
        <Text heading="h2" className="text-sm font-semibold text-primary-accent">
          History
        </Text>
        <WithdrawalHistoryList
          rows={history}
          hasMore={hasMore}
          onLoadMore={loadMore}
          isLoadingMore={isLoadingMore}
          isLoading={isLoading}
        />
      </section>

      <InfoDisclosure summary="How withdrawals work">
        <ul className="flex list-disc flex-col gap-2 pl-5">
          <li>Your request waits for the reserve to be swept, then is broadcast.</li>
          <li>BTC network fees come out of the withdrawal amount.</li>
        </ul>
      </InfoDisclosure>
    </div>
  );
}
