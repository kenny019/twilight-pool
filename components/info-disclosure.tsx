"use client";

import cn from "@/lib/cn";
import { ChevronDown } from "lucide-react";
import React, { useState } from "react";

export interface InfoDisclosureProps {
  summary: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function InfoDisclosure({
  summary,
  children,
  className,
}: InfoDisclosureProps) {
  const [open, setOpen] = useState(false);
  return (
    <details
      open={open}
      onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}
      className={cn("rounded-lg border bg-background px-4 py-3", className)}
    >
      <summary className="flex cursor-pointer items-center justify-between gap-2 text-sm text-primary-accent">
        <span>{summary}</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 transition-transform",
            open ? "rotate-180" : ""
          )}
        />
      </summary>
      <div className="mt-3 text-xs text-primary-accent">{children}</div>
    </details>
  );
}

export default InfoDisclosure;
