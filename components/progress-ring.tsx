"use client";

import cn from "@/lib/cn";
import React from "react";

type Variant = "success" | "warn" | "danger" | "neutral";

export interface ProgressRingProps {
  /** Completed steps / elapsed blocks / whatever the ring is counting up. */
  current: number;
  /** Target or total. */
  total: number;
  /** Optional label rendered centered inside the ring. Defaults to `current`. */
  label?: React.ReactNode;
  /** Force a variant. Otherwise auto-derived from `current/total`. */
  variant?: Variant;
  size?: number;
  stroke?: number;
  className?: string;
  /** Accessible name when there is no visible label, or to override it. */
  ariaLabel?: string;
}

const VARIANT_COLORS: Record<Variant, string> = {
  success: "#22c55e",
  warn: "#eab308",
  danger: "#ef4444",
  neutral: "currentColor",
};

function autoVariant(progress: number, isDone: boolean): Variant {
  if (isDone) return "danger";
  if (progress >= 0.75) return "danger";
  if (progress >= 0.5) return "warn";
  return "success";
}

export function ProgressRing({
  current,
  total,
  label,
  variant,
  size = 80,
  stroke = 6,
  className,
  ariaLabel,
}: ProgressRingProps) {
  const safeTotal = total > 0 ? total : 1;
  const progress = Math.min(Math.max(current / safeTotal, 0), 1);
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashoffset = circumference * (1 - progress);
  const isDone = current >= total && total > 0;

  const resolvedVariant = variant ?? autoVariant(progress, isDone);
  const stroke_color = VARIANT_COLORS[resolvedVariant];
  const displayLabel = label ?? current;

  return (
    <div
      className={cn("relative shrink-0 motion-reduce:transition-none", className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={ariaLabel ?? `${current} of ${total}`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-primary-accent/20"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={stroke_color}
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={dashoffset}
          strokeLinecap="round"
          className="transition-[stroke-dashoffset] duration-500 motion-reduce:transition-none"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span
          className="text-sm font-semibold"
          style={{ color: stroke_color }}
        >
          {displayLabel}
        </span>
      </div>
    </div>
  );
}

export default ProgressRing;
