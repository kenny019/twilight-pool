"use client";

import React from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import cn from "@/lib/cn";

const EXPLORER = process.env.NEXT_PUBLIC_EXPLORER_URL as string;

export function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="w-12 shrink-0 text-[10px] uppercase tracking-wide text-primary-accent/50">
        {label}
      </span>
      <span className="min-w-0 truncate font-mono text-primary-accent/80">
        {value}
      </span>
    </div>
  );
}

export function ExpandedHash({
  hash,
  className,
}: {
  hash: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "space-y-2 rounded-lg bg-primary/[0.02] px-3 py-2.5 text-xs",
        className
      )}
    >
      <div>
        <span className="block text-[10px] uppercase tracking-wide text-primary-accent/60">
          Hash
        </span>
        <div className="mt-0.5 space-y-1">
          <button
            type="button"
            className="font-mono break-all text-left text-primary/80 transition-colors hover:text-primary hover:underline"
            onClick={() => navigator.clipboard.writeText(hash)}
          >
            {hash}
          </button>
          <Link
            href={`${EXPLORER}/txs/${hash}`}
            target="_blank"
            className="inline-flex items-center gap-1 text-primary-accent/60 underline-offset-2 hover:text-primary hover:underline"
          >
            View on Explorer
            <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
