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
  cancelOrder: (order: TradeOrder) => Promise<void>;
  openEditDialog: (order: TradeOrder) => void;
}

export const openOrdersColumns: ColumnDef<TradeOrder, any>[] = [
  {
    accessorKey: "date",
    header: "Time",
    accessorFn: (row) => dayjs(row.date).format("DD/MM/YYYY HH:mm:ss"),
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
    header: "Type",
    cell: (row) => {
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
    header: "Entry Price (USD)",
    accessorFn: (row) =>
      `$${row.settleLimit ? Number(row.settleLimit.price).toFixed(2) : row.entryPrice.toFixed(2)}`,
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

      return (
        <div className="flex flex-row justify-start gap-1">
          {/*{!trade.settleLimit && (
            <Button
              onClick={(e) => {
                e.preventDefault();
                meta.openEditDialog(trade);
              }}
              variant="ui"
              size="small"
            >
              Edit
            </Button>
          )}*/}
          <Button
            onClick={async (e) => {
              e.preventDefault();
              await meta.cancelOrder(trade);
            }}
            variant="ui"
            size="small"
            // disabled={trade.settleLimit !== null}
          >
            Cancel
          </Button>
        </div>
      );
    },
  },
];

// Export the TableMeta type for use in the data table component
export type { OpenOrdersTableMeta };
