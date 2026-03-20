"use client";

import * as React from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/popover";
import { Text } from "@/components/typography";
import cn from "@/lib/cn";
import {
  formatRawPoolShareUnits,
  formatRoundedPoolShares,
  POOL_SHARE_DECIMALS_SCALE,
} from "@/lib/format/poolShares";
import { Info } from "lucide-react";

type PoolSharesCellProps = {
  npoolshare: number;
  className?: string;
};

/**
 * Rounded share count + info control. Click the info icon to see exact raw units
 * (same behavior on all screen sizes — no hover-only or inline raw line).
 */
export function PoolSharesCell({ npoolshare, className }: PoolSharesCellProps) {
  const [open, setOpen] = React.useState(false);
  const rounded = formatRoundedPoolShares(npoolshare);
  const raw = formatRawPoolShareUnits(npoolshare);

  return (
    <span
      className={cn(
        "inline-flex max-w-full min-w-0 items-center gap-1.5",
        className
      )}
    >
      <span className="min-w-0 truncate tabular-nums">{rounded}</span>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-primary-accent transition-colors hover:bg-primary/10 focus-visible:outline focus-visible:ring-2 focus-visible:ring-primary/40"
            aria-label="View exact pool share units"
            aria-expanded={open}
          >
            <Info className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="max-w-xs bg-background/95 px-3 py-2 text-xs"
          side="top"
          align="end"
          sideOffset={4}
        >
          <Text className="font-medium text-primary">Raw share units</Text>
          <Text className="mt-1 font-mono tabular-nums text-primary-accent">
            {raw}
          </Text>
          <Text className="mt-2 text-primary-accent/90">
            {POOL_SHARE_DECIMALS_SCALE.toLocaleString("en-US")} units = 1 share.
            Used for pool accounting.
          </Text>
        </PopoverContent>
      </Popover>
    </span>
  );
}
