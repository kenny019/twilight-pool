"use client";

import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/popover";
import useGetMarketStats from "@/lib/hooks/useGetMarketStats";
import cn from "@/lib/cn";

const STATUS_CONFIG = {
  HEALTHY: {
    dot: "bg-green-medium",
    bg: "bg-green-medium/10",
    text: "text-green-medium",
    label: "Healthy",
  },
  HALT: {
    dot: "bg-red",
    bg: "bg-red/10",
    text: "text-red",
    label: "Halt",
  },
  CLOSE_ONLY: {
    dot: "bg-yellow-500",
    bg: "bg-yellow-500/10",
    text: "text-yellow-500",
    label: "Close Only",
  },
} as const;

type StatusKey = keyof typeof STATUS_CONFIG;

function getConfig(status: string) {
  if (status in STATUS_CONFIG) return STATUS_CONFIG[status as StatusKey];
  return STATUS_CONFIG.HALT; // unknown → red (defensive)
}

export default function RelayerStatus({ dotOnly = false }: { dotOnly?: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const { data, isLoading, isError } = useGetMarketStats();

  if (isLoading || isError || !data) return null;

  const config = getConfig(data.status);
  const showPopover = data.status !== "HEALTHY" && data.status_reason;

  const badge = (
    <button
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium transition-colors",
        config.bg,
        config.text,
        dotOnly && "px-0 py-0 bg-transparent"
      )}
      onMouseEnter={() => showPopover && setIsOpen(true)}
      onMouseLeave={() => showPopover && setIsOpen(false)}
    >
      <span className={cn("h-2 w-2 rounded-full", config.dot)} />
      {!dotOnly && config.label}
    </button>
  );

  if (!showPopover) return badge;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>{badge}</PopoverTrigger>
      <PopoverContent
        className="max-w-xs w-auto px-3 py-2 text-xs bg-background/80"
        side="bottom"
        align="center"
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
      >
        {data.status_reason}
      </PopoverContent>
    </Popover>
  );
}
