"use client";

import Button from "@/components/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/select";
import { truncateHash } from "@/lib/helpers";
import useBtcReserves from "@/lib/hooks/useBtcReserves";
import { Loader2, RefreshCw } from "lucide-react";

interface BtcReserveSelectProps {
  value?: number;
  onValueChange: (reserveId: number) => void;
  id?: string;
  placeholder?: string;
}

export default function BtcReserveSelect({
  value,
  onValueChange,
  id = "select-btc-reserve",
  placeholder = "Select a reserve",
}: BtcReserveSelectProps) {
  const {
    data: btcReserves = [],
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useBtcReserves();

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 h-10 px-3 border rounded-default text-primary-accent">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Loading reserves...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-between gap-2 h-10 px-3 border border-red-500/50 rounded-default text-red-500">
        <span className="text-sm">Failed to load reserves</span>
        <Button
          variant="link"
          size="small"
          onClick={() => refetch()}
          className="text-red-500"
        >
          Retry
        </Button>
      </div>
    );
  }

  if (btcReserves.length === 0) {
    return (
      <div className="flex items-center justify-between gap-2 h-10 px-3 border border-yellow-500/50 rounded-default text-yellow-500">
        <span className="text-sm">No reserves available</span>
        <Button variant="link" size="small" onClick={() => refetch()}>
          Refresh
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Select
        value={value?.toString()}
        onValueChange={(v) => onValueChange(Number(v))}
      >
        <SelectTrigger id={id} className="flex-1">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {btcReserves.map((reserve) => (
            <SelectItem key={reserve.ReserveId} value={reserve.ReserveId}>
              {`Reserve #${reserve.ReserveId} ${truncateHash(reserve.ReserveAddress)}`}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <button
        type="button"
        onClick={() => refetch()}
        disabled={isFetching}
        className="p-2 rounded text-primary-accent hover:text-primary disabled:opacity-50 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
        aria-label="Refresh reserves"
      >
        <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
      </button>
    </div>
  );
}
