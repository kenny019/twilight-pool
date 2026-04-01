import { ColumnDef } from "@tanstack/react-table";
import { ChevronDown, ChevronUp } from "lucide-react";
import dayjs from "dayjs";
import cn from "@/lib/cn";
import { toast } from "@/lib/hooks/useToast";
import { truncateHash } from "@/lib/helpers";
import { PnlCell, PnlHeader } from "@/lib/components/pnl-display";
import {
  OrderHistoryGroup,
  getOrderHistoryPnl,
} from "./grouped-order-history";

export interface OrderHistoryTableMeta {
  getBtcPriceUsd: () => number;
  isExpanded: (uuid: string) => boolean;
  toggleExpand: (uuid: string) => void;
}

export const MANDATORY_COLUMNS = new Set([
  "latestDate",
  "uuid",
  "parentSide",
  "lifecycleValue",
  "expand",
]);

export const DEFAULT_HIDDEN_COLUMNS = new Set<string>();

function getSideClasses(side: string): string {
  return side === "LONG"
    ? "bg-green-medium/10 text-green-medium"
    : "bg-red/10 text-red";
}

function getLifecycleClasses(lifecycle: string): string {
  switch (lifecycle) {
    case "SETTLED":
      return "bg-green-medium/10 text-green-medium";
    case "LIQUIDATE":
      return "bg-red/10 text-red";
    case "CANCELLED":
      return "bg-gray-500/10 text-gray-400";
    case "FILLED":
      return "bg-theme/10 text-theme";
    case "PENDING":
      return "bg-primary/10 text-primary/70";
    default:
      return "bg-gray-500/10 text-gray-400";
  }
}

export const orderHistoryColumns: ColumnDef<OrderHistoryGroup>[] = [
  {
    accessorKey: "latestDate",
    header: "Last Time",
    sortingFn: "datetime",
    cell: (row) =>
      dayjs(row.row.original.latestDate).format("DD/MM/YYYY HH:mm:ss"),
  },
  {
    accessorKey: "uuid",
    header: "Order ID",
    cell: (row) => {
      const group = row.row.original;
      const truncatedUuid = truncateHash(group.uuid, 4, 4);

      return (
        <button
          type="button"
          onClick={() => {
            navigator.clipboard.writeText(group.uuid);
            toast({
              title: "Copied to clipboard",
              description: `Order ID ${truncatedUuid} copied to clipboard`,
            });
          }}
          className="cursor-pointer font-medium hover:underline"
        >
          {truncatedUuid}
        </button>
      );
    },
  },
  {
    accessorKey: "parentSide",
    header: "Side",
    cell: (row) => {
      const side = row.row.original.parentSide;
      return (
        <span
          className={cn(
            "rounded px-2 py-1 text-xs font-semibold",
            getSideClasses(side)
          )}
        >
          {side}
        </span>
      );
    },
  },
  {
    accessorKey: "lifecycleValue",
    header: "Lifecycle",
    cell: (row) => {
      const group = row.row.original;
      return (
        <span
          className={cn(
            "rounded px-2 py-1 text-xs font-medium",
            getLifecycleClasses(group.lifecycleValue)
          )}
        >
          {group.lifecycleLabel}
        </span>
      );
    },
  },
  {
    accessorKey: "parentType",
    header: "Type",
    cell: (row) => (
      <span className="font-medium text-primary/80">
        {row.row.original.parentType}
      </span>
    ),
  },
  {
    accessorKey: "latestEventValue",
    header: "Latest Event",
    cell: (row) => (
      <span className="text-xs font-medium text-primary/70">
        {row.row.original.latestEventLabel}
      </span>
    ),
  },
  {
    accessorKey: "parentEntryPrice",
    header: "Entry",
    cell: (row) => (
      <span className="font-medium">
        ${row.row.original.parentEntryPrice.toFixed(2)}
      </span>
    ),
  },
  {
    id: "closeOrTrigger",
    accessorFn: (row) => row.closeOrTriggerValue,
    header: "Close / Trigger",
    cell: (row) => {
      const group = row.row.original;

      if (group.closeOrTriggerValue == null) {
        return <span className="text-xs text-gray-500">—</span>;
      }

      return (
        <div className="flex flex-col leading-tight">
          <span className="text-[10px] uppercase tracking-wide text-gray-500">
            {group.closeOrTriggerLabel}
          </span>
          <span className="font-medium">
            ${group.closeOrTriggerValue.toFixed(2)}
          </span>
        </div>
      );
    },
  },
  {
    id: "pnl",
    accessorFn: (row) =>
      row.pnlRow ? getOrderHistoryPnl(row.pnlRow) ?? null : null,
    header: () => <PnlHeader variant="PnL" />,
    cell: (row) => {
      const group = row.row.original;
      const meta = row.table.options.meta as OrderHistoryTableMeta;

      if (!group.pnlRow) {
        return <span className="text-xs text-gray-500">—</span>;
      }

      return (
        <PnlCell
          pnlSats={getOrderHistoryPnl(group.pnlRow)}
          btcPriceUsd={meta.getBtcPriceUsd()}
        />
      );
    },
  },
  {
    id: "expand",
    header: "",
    enableSorting: false,
    cell: (row) => {
      const group = row.row.original;
      const meta = row.table.options.meta as OrderHistoryTableMeta;
      const expanded = meta.isExpanded(group.uuid);

      return (
        <button
          type="button"
          onClick={() => meta.toggleExpand(group.uuid)}
          className="ml-auto flex items-center gap-1 rounded px-1.5 py-1 text-[11px] font-medium text-primary-accent transition-colors hover:bg-theme/20 hover:text-primary"
          aria-label={expanded ? "Collapse order timeline" : "Expand order timeline"}
        >
          <span>{expanded ? "Hide" : "Show"}</span>
          {expanded ? (
            <ChevronUp className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )}
        </button>
      );
    },
  },
];
