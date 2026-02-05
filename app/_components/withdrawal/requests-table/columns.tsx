import { ColumnDef } from "@tanstack/react-table";
import { WithdrawRequest } from "@/lib/api/rest";
import { truncateHash } from "@/lib/helpers";
import { toast } from "@/lib/hooks/useToast";
import BTC from "@/lib/twilight/denoms";
import Big from "big.js";

export const withdrawRequestColumns: ColumnDef<WithdrawRequest, any>[] = [
  {
    accessorKey: "withdrawIdentifier",
    header: "ID",
  },
  {
    accessorKey: "withdrawAddress",
    header: "BTC Address",
    cell: (row) => {
      const addr = row.getValue() as string;
      const truncated = truncateHash(addr, 6, 6);
      return (
        <span
          onClick={() => {
            navigator.clipboard.writeText(addr);
            toast({
              title: "Copied",
              description: "Address copied to clipboard",
            });
          }}
          className="cursor-pointer font-mono hover:underline"
        >
          {truncated}
        </span>
      );
    },
  },
  {
    accessorKey: "withdrawAmount",
    header: "Amount",
    cell: (row) => {
      const sats = row.getValue() as string;
      const btc = new BTC("sats", Big(sats)).convert("BTC");
      return (
        <span className="font-mono text-right">
          {BTC.format(btc, "BTC")} BTC
        </span>
      );
    },
  },
  {
    accessorKey: "withdrawReserveId",
    header: "Reserve",
    cell: (row) => {
      const reserveId = row.getValue() as string;
      return <span>#{reserveId}</span>;
    },
  },
];
