import cn from "@/lib/cn";
import React from "react";

export type StatusBadgeVariant =
  | "muted"
  | "pending"
  | "active"
  | "success"
  | "warn"
  | "danger";

export interface StatusBadgeProps {
  variant: StatusBadgeVariant;
  icon?: React.ReactNode;
  /** Show a leading pulsing dot. Defaults to true for `active`/`warn`. */
  pulse?: boolean;
  className?: string;
  children: React.ReactNode;
}

const VARIANT_CLASS: Record<StatusBadgeVariant, string> = {
  muted: "bg-gray-500/10 text-gray-400",
  pending: "bg-primary-accent/10 text-primary-accent",
  active: "bg-theme/10 text-theme",
  success: "bg-green-medium/10 text-green-medium",
  warn: "bg-yellow-500/10 text-yellow-500",
  danger: "bg-red-500/10 text-red-500",
};

const DOT_CLASS: Record<StatusBadgeVariant, string> = {
  muted: "bg-gray-400",
  pending: "bg-primary-accent",
  active: "bg-theme",
  success: "bg-green-medium",
  warn: "bg-yellow-500",
  danger: "bg-red-500",
};

export function StatusBadge({
  variant,
  icon,
  pulse,
  className,
  children,
}: StatusBadgeProps) {
  const shouldPulse = pulse ?? (variant === "active" || variant === "warn");
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded px-2 py-1 text-xs font-medium",
        VARIANT_CLASS[variant],
        className
      )}
    >
      {icon ? (
        <span aria-hidden="true">{icon}</span>
      ) : shouldPulse ? (
        <span
          aria-hidden="true"
          className={cn(
            "h-1.5 w-1.5 shrink-0 rounded-full motion-reduce:animate-none animate-pulse",
            DOT_CLASS[variant]
          )}
        />
      ) : null}
      <span>{children}</span>
    </span>
  );
}

export default StatusBadge;
