import cn from "@/lib/cn";
import React from "react";

export type StatusBadgeVariant =
  | "muted"
  | "pending"
  | "active"
  | "success"
  | "danger";

export interface StatusBadgeProps {
  variant: StatusBadgeVariant;
  icon?: React.ReactNode;
  /** Show a leading pulsing dot. Defaults to true for `active`. */
  pulse?: boolean;
  className?: string;
  children: React.ReactNode;
}

const VARIANT_CLASS: Record<StatusBadgeVariant, string> = {
  muted: "bg-primary-accent/10 text-primary-accent/60",
  pending: "bg-primary-accent/10 text-primary-accent",
  active: "bg-theme/10 text-theme",
  success: "bg-green-medium/10 text-green-medium",
  danger: "bg-red/10 text-red",
};

const DOT_CLASS: Record<StatusBadgeVariant, string> = {
  muted: "bg-primary-accent/60",
  pending: "bg-primary-accent",
  active: "bg-theme",
  success: "bg-green-medium",
  danger: "bg-red",
};

export function StatusBadge({
  variant,
  icon,
  pulse,
  className,
  children,
}: StatusBadgeProps) {
  const shouldPulse = pulse ?? variant === "active";
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
