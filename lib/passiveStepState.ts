import type { StepState } from "@/components/stepper";

/**
 * Translate a derived linear status (e.g. "awaiting_send" → "confirming" →
 * "credited") into a per-step Stepper state for passive read-only display.
 * Shared by deposit and withdrawal active cards.
 *
 * `terminalState` is the linear state that means "all steps done" — it's
 * mapped to "completed" on the final step and on every step before it.
 */
export function passiveStepState<S extends string>(
  stepId: S,
  current: S | string,
  stepOrder: readonly S[],
  terminalState: S
): StepState {
  const idx = stepOrder.indexOf(stepId);
  const curIdx = stepOrder.indexOf(current as S);
  if (curIdx < 0) return "upcoming";
  if (idx < curIdx) return "completed";
  if (idx === curIdx) return current === terminalState ? "completed" : "active";
  return "upcoming";
}

export function confirmationsMeta(
  confirmations: number | undefined,
  etaMinutes: number | undefined,
  required: number
): string {
  const conf =
    typeof confirmations === "number" ? `${confirmations} / ${required} conf` : "";
  const eta =
    typeof etaMinutes === "number" && etaMinutes > 0
      ? `~${etaMinutes}m${required > 1 ? " left" : ""}`
      : "";
  return [conf, eta].filter(Boolean).join(" · ");
}
