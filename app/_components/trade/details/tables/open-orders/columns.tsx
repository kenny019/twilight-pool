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
  openConditionalDialog: (account: string, mode: "limit" | "sltp") => void;
  isCancellingOrder: (uuid: string) => boolean;
}

export const openOrdersColumns: ColumnDef<OpenOrderRow, any>[] = [
  {
    accessorKey: "date",
    header: "Time",
    accessorFn: (row) => {
      if (row._sltpLeg === "sl") {
        const ts = row.stopLoss?.created_time;
        return ts
          ? dayjs(ts).format("DD/MM/YYYY HH:mm:ss")
          : dayjs(row.date).format("DD/MM/YYYY HH:mm:ss");
      }
      if (row._sltpLeg === "tp") {
        const ts = row.takeProfit?.created_time;
        return ts
          ? dayjs(ts).format("DD/MM/YYYY HH:mm:ss")
          : dayjs(row.date).format("DD/MM/YYYY HH:mm:ss");
      }
      const ts =
        row.settleLimit?.created_time ??
        row.takeProfit?.created_time ??
        row.stopLoss?.created_time;
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
        const price = parseFloat(row.stopLoss.price);
        return isFinite(price) ? `SL: $${price.toFixed(2)}` : "SL: —";
      }
      if (row._sltpLeg === "tp" && row.takeProfit) {
        const price = parseFloat(row.takeProfit.price);
        return isFinite(price) ? `TP: $${price.toFixed(2)}` : "TP: —";
      }
      const limitPrice = row.settleLimit ? Number(row.settleLimit.price) : row.entryPrice;
      return `$${isFinite(limitPrice) ? limitPrice.toFixed(2) : "—"}`;
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
          <div className="flex flex-row gap-1">
            <Button
              onClick={async (e) => {
                e.preventDefault();
                await meta.cancelOrder(trade, { sl_bool: true, tp_bool: false });
              }}
              variant="ui"
              size="small"
              disabled={isCancelling}
            >
              {isCancelling ? "Removing..." : "Remove"}
            </Button>
            <Button
              variant="ui"
              size="small"
              disabled={isCancelling}
              onClick={(e) => {
                e.preventDefault();
                meta.openConditionalDialog(trade.accountAddress, "sltp");
              }}
            >
              Edit
            </Button>
          </div>
        );
      }

      if (trade._sltpLeg === "tp") {
        return (
          <div className="flex flex-row gap-1">
            <Button
              onClick={async (e) => {
                e.preventDefault();
                await meta.cancelOrder(trade, { sl_bool: false, tp_bool: true });
              }}
              variant="ui"
              size="small"
              disabled={isCancelling}
            >
              {isCancelling ? "Removing..." : "Remove"}
            </Button>
            <Button
              variant="ui"
              size="small"
              disabled={isCancelling}
              onClick={(e) => {
                e.preventDefault();
                meta.openConditionalDialog(trade.accountAddress, "sltp");
              }}
            >
              Edit
            </Button>
          </div>
        );
      }

      // Regular limit/entry row
      return (
        <div className="flex flex-row gap-1">
          <Button
            onClick={async (e) => {
              e.preventDefault();
              await meta.cancelOrder(trade);
            }}
            variant="ui"
            size="small"
            disabled={isCancelling}
          >
            {isCancelling ? "Removing..." : "Remove"}
          </Button>
          {trade.settleLimit && (
            <Button
              variant="ui"
              size="small"
              disabled={isCancelling}
              onClick={(e) => {
                e.preventDefault();
                meta.openEditDialog(trade);
              }}
            >
              Edit
            </Button>
          )}
        </div>
      );
    },
  },
];

// Export the TableMeta type for use in the data table component
export type { OpenOrdersTableMeta };
