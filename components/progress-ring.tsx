"use client";

import cn from "@/lib/cn";
import React from "react";

export type ProgressRingVariant =
  | "theme"
  | "success"
  | "danger"
  | "neutral";

export interface ProgressRingProps {
  /** Completed steps / elapsed blocks / whatever the ring is counting up. */
  current: number;
  /** Target or total. */
  total: number;
  /** Optional label rendered centered inside the ring. Defaults to `current`. */
  label?: React.ReactNode;
  /**
   * Presentation variant. Callers decide policy (e.g. when to flip to
   * `danger`); the ring is a pure renderer.
   */
  variant?: ProgressRingVariant;
  size?: number;
  stroke?: number;
  className?: string;
  /** Accessible name when there is no visible label, or to override it. */
  ariaLabel?: string;
}

const VARIANT_CLASS: Record<ProgressRingVariant, string> = {
  theme: "text-theme",
  success: "text-green-medium",
  danger: "text-red",
  neutral: "text-primary-accent",
};

export function ProgressRing({
  current,
  total,
  label,
  variant = "neutral",
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
  const displayLabel = label ?? current;

  return (
    <div
      className={cn(
        "relative shrink-0 motion-reduce:transition-none",
        VARIANT_CLASS[variant],
        className
      )}
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
          stroke="currentColor"
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={dashoffset}
          strokeLinecap="round"
          className="transition-[stroke-dashoffset] duration-500 motion-reduce:transition-none"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-semibold">{displayLabel}</span>
      </div>
    </div>
  );
}

export default ProgressRing;
