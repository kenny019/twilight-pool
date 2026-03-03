import Button from "@/components/button";
import cn from "@/lib/cn";
import { capitaliseFirstLetter, truncateHash } from "@/lib/helpers";
import { toast } from "@/lib/hooks/useToast";
import BTC from "@/lib/twilight/denoms";
import { TradeOrder } from "@/lib/types";
import { ColumnDef } from "@tanstack/react-table";
import Big from "big.js";
import dayjs from "dayjs";

interface OpenOrdersTableMeta {
  cancelOrder: (
    order: TradeOrder,
    options?: { sl_bool?: boolean; tp_bool?: boolean }
  ) => Promise<void>;
  openEditDialog: (order: TradeOrder) => void;
  isCancellingOrder: (uuid: string) => boolean;
}

export const openOrdersColumns: ColumnDef<TradeOrder, any>[] = [
  {
    accessorKey: "date",
    header: "Time",
    accessorFn: (row) => {
      const ts =
        row.settleLimit?.timestamp ??
        row.takeProfit?.timestamp ??
        row.stopLoss?.timestamp;
      return ts
        ? dayjs(ts).format("DD/MM/YYYY HH:mm:ss")
        : dayjs(row.date).format("DD/MM/YYYY HH:mm:ss");
    },
  },
  {
    accessorKey: "uuid",
    header: "Order ID",
    cell: (row) => {
      const trade = row.row.original;

      const uuid = trade.settleLimit ? trade.settleLimit.uuid : trade.uuid;
      const truncatedUuid = truncateHash(uuid, 4, 4);

      return (
        <span
          onClick={() => {
            navigator.clipboard.writeText(uuid);
            toast({
              title: "Copied to clipboard",
              description: `Order ID ${truncatedUuid} copied to clipboard`,
            });
          }}
          className="cursor-pointer font-medium hover:underline"
        >
          {truncatedUuid}
        </span>
      );
    },
  },
  {
    accessorKey: "positionType",
    header: "Side",
    cell: (row) => {
      const trade = row.row.original;
      const positionType = trade.settleLimit
        ? trade.settleLimit.position_type
        : trade.positionType;

      return (
        <span
          className={cn(
            "rounded px-2 py-1 text-xs font-medium",
            positionType === "LONG"
              ? "bg-green-medium/10 text-green-medium"
              : "bg-red/10 text-red"
          )}
        >
          {capitaliseFirstLetter(positionType)}
        </span>
      );
    },
  },
  {
    id: "type",
    header: "Type",
    cell: ({ row }) => {
      const trade = row.original;
      if (trade.takeProfit || trade.stopLoss) {
        return (
          <span className="rounded bg-purple-500/10 px-2 py-1 text-xs font-medium text-purple-500">
            SLTP
          </span>
        );
      }
      if (trade.settleLimit) {
        return (
          <span className="rounded bg-yellow-500/10 px-2 py-1 text-xs font-medium text-yellow-500">
            Close
          </span>
        );
      }
      return (
        <span className="rounded bg-primary-accent/10 px-2 py-1 text-xs font-medium text-primary-accent">
          Open
        </span>
      );
    },
  },
  {
    accessorKey: "positionSize",
    header: "Position Size (USD)",
    cell: (row) => {
      const trade = row.row.original;
      const positionSize = new BTC("sats", Big(trade.positionSize))
        .convert("BTC")
        .toFixed(2);

      return <span className="font-medium">${positionSize}</span>;
    },
  },

  {
    accessorKey: "orderType",
    header: "Order Type",
    cell: (row) => {
      const trade = row.row.original;
      if (trade.takeProfit || trade.stopLoss) {
        return (
          <span className="text-xs font-medium">
            {capitaliseFirstLetter(trade.orderType)}
          </span>
        );
      }
      const orderType = row.getValue() as string;
      return (
        <span className="text-xs font-medium">
          {capitaliseFirstLetter(orderType)}
        </span>
      );
    },
  },
  {
    accessorKey: "entryPrice",
    header: "Price (USD)",
    accessorFn: (row) => {
      if (row.takeProfit || row.stopLoss) {
        const parts: string[] = [];
        if (row.stopLoss)
          parts.push(`SL: $${Number(row.stopLoss.sl_price).toFixed(2)}`);
        if (row.takeProfit)
          parts.push(`TP: $${Number(row.takeProfit.tp_price).toFixed(2)}`);
        return parts.join(" / ");
      }
      return `$${row.settleLimit ? Number(row.settleLimit.price).toFixed(2) : row.entryPrice.toFixed(2)}`;
    },
  },
  {
    accessorKey: "leverage",
    header: "Leverage",
    accessorFn: (row) => `${row.leverage.toFixed(2)}x`,
  },
  {
    accessorKey: "availableMargin",
    header: "Avail. Margin (BTC)",
    accessorFn: (row) =>
      BTC.format(
        new BTC("sats", Big(row.availableMargin)).convert("BTC"),
        "BTC"
      ),
  },
  {
    accessorKey: "actions",
    header: "Action",
    cell: (row) => {
      const trade = row.row.original;
      const meta = row.table.options.meta as OpenOrdersTableMeta;
      const isCancelling = meta.isCancellingOrder(trade.uuid);
      const isSltp = !!(trade.takeProfit || trade.stopLoss);

      if (isSltp) {
        const hasSl = !!trade.stopLoss;
        const hasTp = !!trade.takeProfit;
        return (
          <div className="flex flex-row flex-wrap justify-start gap-1">
            {hasSl && (
              <Button
                onClick={async (e) => {
                  e.preventDefault();
                  await meta.cancelOrder(trade, { sl_bool: true });
                }}
                variant="ui"
                size="small"
                disabled={isCancelling}
              >
                {isCancelling ? "Cancelling..." : "Cancel SL"}
              </Button>
            )}
            {hasTp && (
              <Button
                onClick={async (e) => {
                  e.preventDefault();
                  await meta.cancelOrder(trade, { tp_bool: true });
                }}
                variant="ui"
                size="small"
                disabled={isCancelling}
              >
                {isCancelling ? "Cancelling..." : "Cancel TP"}
              </Button>
            )}
            {(hasSl || hasTp) && (
              <Button
                onClick={async (e) => {
                  e.preventDefault();
                  await meta.cancelOrder(trade, {
                    sl_bool: hasSl,
                    tp_bool: hasTp,
                  });
                }}
                variant="ui"
                size="small"
                disabled={isCancelling}
              >
                {isCancelling ? "Cancelling..." : "Cancel Both"}
              </Button>
            )}
          </div>
        );
      }

      return (
        <div className="flex flex-row justify-start gap-1">
          <Button
            onClick={async (e) => {
              e.preventDefault();
              await meta.cancelOrder(trade);
            }}
            variant="ui"
            size="small"
            disabled={isCancelling}
          >
            {isCancelling ? "Cancelling..." : "Cancel"}
          </Button>
        </div>
      );
    },
  },
];

// Export the TableMeta type for use in the data table component
export type { OpenOrdersTableMeta };
