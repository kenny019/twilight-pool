import cn from "@/lib/cn";
import { Inbox } from "lucide-react";
import React from "react";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 py-10 text-center",
        className
      )}
    >
      <span className="text-primary-accent/40">
        {icon ?? <Inbox className="h-6 w-6" />}
      </span>
      <p className="text-sm text-primary-accent">{title}</p>
      {description && (
        <p className="max-w-xs text-xs text-primary-accent/60">{description}</p>
      )}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}

interface TableEmptyRowProps {
  colSpan: number;
  title?: string;
  className?: string;
}

function TableEmptyRow({
  colSpan,
  title = "No results.",
  className,
}: TableEmptyRowProps) {
  return (
    <tr>
      <td
        colSpan={colSpan}
        className={cn(
          "h-24 px-2 py-2 text-center text-xs text-primary-accent",
          className
        )}
      >
        {title}
      </td>
    </tr>
  );
}

export { EmptyState, TableEmptyRow };
export type { EmptyStateProps, TableEmptyRowProps };
