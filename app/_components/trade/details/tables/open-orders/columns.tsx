import Button from "@/components/button";
import cn from "@/lib/cn";
import { capitaliseFirstLetter, truncateHash } from "@/lib/helpers";
import { toast } from "@/lib/hooks/useToast";
import BTC from "@/lib/twilight/denoms";
import { TradeOrder } from "@/lib/types";
import { OpenOrderRow } from "../../details.client";
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

export const openOrdersColumns: ColumnDef<OpenOrderRow, any>[] = [
  {
    accessorKey: "date",
    header: "Time",
    accessorFn: (row) => {
      if (row._sltpLeg === "sl") {
        return row.stopLoss?.timestamp
          ? dayjs(row.stopLoss.timestamp).format("DD/MM/YYYY HH:mm:ss")
          : dayjs(row.date).format("DD/MM/YYYY HH:mm:ss");
      }
      if (row._sltpLeg === "tp") {
        return row.takeProfit?.timestamp
          ? dayjs(row.takeProfit.timestamp).format("DD/MM/YYYY HH:mm:ss")
          : dayjs(row.date).format("DD/MM/YYYY HH:mm:ss");
      }
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

      const uuid =
        trade._sltpLeg
          ? trade.uuid
          : trade.settleLimit
            ? trade.settleLimit.uuid
            : trade.uuid;
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
      const positionType =
        !trade._sltpLeg && trade.settleLimit
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

      if (trade._sltpLeg === "sl") {
        return (
          <span className="rounded bg-red/10 px-2 py-1 text-xs font-medium text-red">
            SL
          </span>
        );
      }
      if (trade._sltpLeg === "tp") {
        return (
          <span className="rounded bg-green-medium/10 px-2 py-1 text-xs font-medium text-green-medium">
            TP
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
      if (trade._sltpLeg) {
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
      if (row._sltpLeg === "sl" && row.stopLoss) {
        return `SL: $${Number(row.stopLoss.sl_price).toFixed(2)}`;
      }
      if (row._sltpLeg === "tp" && row.takeProfit) {
        return `TP: $${Number(row.takeProfit.tp_price).toFixed(2)}`;
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
      // Use the base trade UUID for the in-progress check so both SL and TP
      // rows show "Cancelling..." while a cancel is underway for that position.
      const isCancelling = meta.isCancellingOrder(trade.uuid);

      if (trade._sltpLeg === "sl") {
        return (
          <Button
            onClick={async (e) => {
              e.preventDefault();
              await meta.cancelOrder(trade, { sl_bool: true, tp_bool: false });
            }}
            variant="ui"
            size="small"
            disabled={isCancelling}
          >
            {isCancelling ? "Cancelling..." : "Cancel"}
          </Button>
        );
      }

      if (trade._sltpLeg === "tp") {
        return (
          <Button
            onClick={async (e) => {
              e.preventDefault();
              await meta.cancelOrder(trade, { sl_bool: false, tp_bool: true });
            }}
            variant="ui"
            size="small"
            disabled={isCancelling}
          >
            {isCancelling ? "Cancelling..." : "Cancel"}
          </Button>
        );
      }

      // Regular limit/entry row
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
