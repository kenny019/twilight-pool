"use client";

import cn from "@/lib/cn";
import { Check, Circle, X } from "lucide-react";
import React from "react";

export type StatusTimelineStepState = "done" | "active" | "pending" | "failed";

export interface StatusTimelineStep {
  id: string;
  label: string;
  state: StatusTimelineStepState;
  timestamp?: string;
  meta?: React.ReactNode;
}

export interface StatusTimelineProps {
  steps: StatusTimelineStep[];
  orientation?: "vertical" | "horizontal";
  className?: string;
}

export function StatusTimeline({
  steps,
  orientation = "vertical",
  className,
}: StatusTimelineProps) {
  const isHorizontal = orientation === "horizontal";
  return (
    <ol
      role="list"
      aria-live="polite"
      className={cn(
        isHorizontal
          ? "flex flex-row items-start gap-0"
          : "flex flex-col gap-0",
        className
      )}
    >
      {steps.map((step, i) => {
        const isLast = i === steps.length - 1;
        return (
          <li
            key={step.id}
            role="listitem"
            aria-current={step.state === "active" ? "step" : undefined}
            className={cn(
              isHorizontal
                ? "relative flex flex-1 flex-col items-center gap-1"
                : "relative flex items-start gap-3"
            )}
          >
            <TimelineDot state={step.state} />
            {!isLast && <Connector orientation={orientation} state={step.state} />}
            <div
              className={cn(
                isHorizontal
                  ? "mt-1 flex flex-col items-center gap-0.5 text-center"
                  : "flex flex-col gap-0.5 pb-4"
              )}
            >
              <span
                className={cn(
                  "text-xs font-medium",
                  step.state === "active" && "text-theme",
                  step.state === "done" && "text-primary-accent",
                  step.state === "pending" && "text-primary-accent/60",
                  step.state === "failed" && "text-red-500"
                )}
              >
                {step.label}
              </span>
              {step.timestamp && (
                <span className="text-[10px] text-primary-accent/60">
                  {step.timestamp}
                </span>
              )}
              {step.meta && (
                <div className="text-[11px] text-primary-accent/70">
                  {step.meta}
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function TimelineDot({ state }: { state: StatusTimelineStepState }) {
  if (state === "done") {
    return (
      <span
        aria-hidden="true"
        className="z-10 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-medium text-white"
      >
        <Check className="h-3 w-3" />
      </span>
    );
  }
  if (state === "active") {
    return (
      <span
        aria-hidden="true"
        className="z-10 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-theme bg-background"
      >
        <span className="h-2 w-2 animate-pulse rounded-full bg-theme motion-reduce:animate-none" />
      </span>
    );
  }
  if (state === "failed") {
    return (
      <span
        aria-hidden="true"
        className="z-10 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-500 text-white"
      >
        <X className="h-3 w-3" />
      </span>
    );
  }
  return (
    <span
      aria-hidden="true"
      className="z-10 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-primary-accent/30 bg-background text-primary-accent/40"
    >
      <Circle className="h-2 w-2" />
    </span>
  );
}

function Connector({
  orientation,
  state,
}: {
  orientation: "vertical" | "horizontal";
  state: StatusTimelineStepState;
}) {
  const isActive = state === "done" || state === "active";
  const color = isActive ? "bg-theme/70" : "bg-primary-accent/20";
  if (orientation === "horizontal") {
    return (
      <span
        aria-hidden="true"
        className={cn(
          "absolute top-2.5 left-1/2 h-0.5 w-full",
          color
        )}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={cn(
        "absolute left-2.5 top-5 h-full w-0.5 -translate-x-1/2",
        color
      )}
    />
  );
}

export default StatusTimeline;
