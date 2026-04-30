"use client";

import React from "react";
import { Check, X } from "lucide-react";
import cn from "@/lib/cn";

export type StepState = "completed" | "active" | "upcoming" | "failed";

export interface StepperStep {
  id: string;
  label: string;
  /**
   * Per-step state. When omitted, derived from `currentStep`:
   * before → completed, equal → active, after → upcoming.
   */
  state?: StepState;
  /** Optional caption (e.g. relative time) shown beneath the label. */
  timestamp?: string;
  /** Optional meta line shown beneath the timestamp. */
  meta?: React.ReactNode;
}

export interface StepperProps {
  steps: StepperStep[];
  currentStep: number;
  className?: string;
  connectorWidth?: string | string[];
  /**
   * Layout orientation. Defaults to `responsive` (column on mobile, row on
   * desktop) which matches the form-step usage. `vertical` and `horizontal`
   * lock the layout for passive read-only timelines.
   */
  orientation?: "responsive" | "vertical" | "horizontal";
}

function defaultStateFor(index: number, current: number): StepState {
  const stepNumber = index + 1;
  if (stepNumber < current) return "completed";
  if (stepNumber === current) return "active";
  return "upcoming";
}

const Stepper = React.forwardRef<HTMLOListElement, StepperProps>(
  (
    {
      steps,
      currentStep,
      className,
      connectorWidth = "w-16",
      orientation = "responsive",
    },
    ref
  ) => {
    const getConnectorWidth = (index: number) => {
      if (Array.isArray(connectorWidth)) {
        return connectorWidth[index] || "w-16";
      }
      return connectorWidth;
    };

    const orientationClass =
      orientation === "vertical"
        ? "flex flex-col gap-2"
        : orientation === "horizontal"
        ? "flex flex-row items-start gap-3"
        : "flex flex-col gap-2 md:flex-row md:items-start md:space-x-4";

    const stepItemClass =
      orientation === "vertical"
        ? "flex items-center gap-3"
        : orientation === "horizontal"
        ? "flex flex-col items-center gap-2"
        : "flex items-center gap-3 md:flex-col md:items-center md:gap-0 md:space-y-2";

    const verticalConnector =
      orientation === "vertical"
        ? true
        : orientation === "horizontal"
        ? false
        : "responsive";

    return (
      <ol
        ref={ref}
        aria-live="polite"
        className={cn("list-none p-0", orientationClass, className)}
      >
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const state = step.state ?? defaultStateFor(index, currentStep);
          const isAdvanced = state === "completed" || state === "active";
          const isLast = index === steps.length - 1;
          const hasFailed = state === "failed";

          const connectorClass =
            state === "completed"
              ? "bg-theme"
              : hasFailed
              ? "bg-red/40"
              : "bg-primary-accent/30";

          return (
            <React.Fragment key={step.id}>
              <li
                aria-current={state === "active" ? "step" : undefined}
                className={stepItemClass}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-sm font-medium transition-all duration-300",
                    {
                      "border-theme bg-theme text-white": isAdvanced,
                      "border-primary-accent/30 bg-background text-primary-accent/60":
                        state === "upcoming",
                      "border-red bg-red text-white": hasFailed,
                    }
                  )}
                >
                  {hasFailed ? (
                    <X className="h-4 w-4" />
                  ) : state === "completed" && step.state ? (
                    // Only show the check when the caller explicitly set state.
                    // Legacy currentStep-driven mode keeps the numeric badge.
                    <Check className="h-4 w-4" />
                  ) : (
                    stepNumber
                  )}
                </span>
                <div
                  className={cn(
                    "flex flex-col gap-0.5",
                    orientation === "horizontal" && "items-center text-center",
                    orientation === "responsive" &&
                      "md:items-center md:text-center"
                  )}
                >
                  <span
                    className={cn(
                      "text-xs font-medium transition-colors duration-300",
                      {
                        "text-theme": isAdvanced,
                        "text-primary-accent/60": state === "upcoming",
                        "text-red": hasFailed,
                      }
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

              {!isLast && (
                <li aria-hidden="true" className="contents">
                  {verticalConnector === true && (
                    <div
                      className={cn(
                        "ml-4 w-0.5 self-stretch",
                        connectorClass
                      )}
                      style={{ minHeight: "16px" }}
                    />
                  )}
                  {verticalConnector === false && (
                    <div
                      className={cn(
                        "mt-3.5 h-0.5 self-start transition-colors duration-300",
                        getConnectorWidth(index),
                        connectorClass
                      )}
                    />
                  )}
                  {verticalConnector === "responsive" && (
                    <>
                      <div
                        className={cn(
                          "ml-4 w-0.5 self-stretch md:hidden",
                          connectorClass
                        )}
                        style={{ minHeight: "16px" }}
                      />
                      <div
                        className={cn(
                          "mt-3.5 hidden h-0.5 self-start transition-colors duration-300 md:block",
                          getConnectorWidth(index),
                          connectorClass
                        )}
                      />
                    </>
                  )}
                </li>
              )}
            </React.Fragment>
          );
        })}
      </ol>
    );
  }
);

Stepper.displayName = "Stepper";

export default Stepper;
