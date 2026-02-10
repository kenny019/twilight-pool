import { ColumnDef } from "@tanstack/react-table";
import { WithdrawRequest } from "@/lib/api/rest";
import { truncateHash } from "@/lib/helpers";
import { toast } from "@/lib/hooks/useToast";
import cn from "@/lib/cn";
import BTC from "@/lib/twilight/denoms";
import Big from "big.js";
import Button from "@/components/button";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

export type MergedWithdrawRequest = WithdrawRequest & {
  tx_hash?: string;
  status?: "queued" | "completed";
};

export const withdrawRequestColumns: ColumnDef<MergedWithdrawRequest, any>[] = [
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
    accessorKey: "tx_hash",
    header: "Tx Hash",
    cell: (row) => {
      const hash = row.getValue() as string | undefined;
      if (!hash) return <span className="text-primary-accent">-</span>;
      return (
        <Button className="justify-start gap-0 items-start" asChild variant="link">
          <Link
            href={`${process.env.NEXT_PUBLIC_EXPLORER_URL as string}/tx/${hash}`}
            target="_blank"
          >
            {truncateHash(hash)} <ArrowUpRight className="h-3 w-3" />
          </Link>
        </Button>
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
  {
    accessorKey: "status",
    header: "Status",
    cell: (row) => {
      const status = row.getValue() as string | undefined;
      if (!status) return <span className="text-primary-accent">-</span>;
      return (
        <span
          className={cn(
            "px-2 py-1 rounded text-xs font-medium",
            status === "completed"
              ? "bg-green-medium/10 text-green-medium"
              : "bg-gray-500/10 text-gray-500"
          )}
        >
          {status === "completed" ? "Completed" : "Queued"}
        </span>
      );
    },
  },
];
