"use client";

import { useEffect, useState } from "react";
import {
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/dialog";
import {
  ConnectionState,
  UseWalletConnectionReturn,
} from "@/lib/hooks/useWalletConnection";
import { useTwilight } from "@/lib/providers/twilight";
import WalletList from "./wallet-list.client";
import WalletStatePane from "./wallet-state-pane.client";
import Button from "@/components/button";
import { BarChart4, EyeOff, Lock, type LucideIcon } from "lucide-react";

interface WalletModalProps {
  state: ConnectionState;
  connect: UseWalletConnectionReturn["connect"];
  retry: UseWalletConnectionReturn["retry"];
  reset: UseWalletConnectionReturn["reset"];
}

// ---------------------------------------------------------------------------
// Onboarding components (first-time users only)
// ---------------------------------------------------------------------------

function FeatureRow({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-center gap-4">
      <div className="shrink-0 rounded-full bg-button-secondary p-2 text-primary-accent">
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-xs text-primary-accent">{description}</p>
      </div>
    </div>
  );
}

function WelcomeView({ onNext }: { onNext: () => void }) {
  return (
    <div className="flex flex-col gap-5 p-6">
      <div>
        <DialogTitle className="text-lg font-semibold">
          Welcome to Twilight
        </DialogTitle>
        <DialogDescription className="mt-1 text-sm text-primary-accent">
          {`Start trading on the world's most private crypto exchange.`}
        </DialogDescription>
      </div>
      <div className="flex flex-col gap-4">
        <FeatureRow
          icon={BarChart4}
          title="Liquid"
          description="Trade with zero-spread pricing powered by our deep liquidity pool."
        />
        <FeatureRow
          icon={EyeOff}
          title="Private"
          description="Anonymous transactions that are fast with lower fees."
        />
        <FeatureRow
          icon={Lock}
          title="Secure"
          description="Cutting edge tech on Bitcoin layer 2 providing security and self-custody."
        />
      </div>
      <Button onClick={onNext} size="default" className="w-full justify-center">
        Get Started
      </Button>
    </div>
  );
}

function StepRow({
  step,
  title,
  description,
}: {
  step: number;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-button-secondary text-sm text-primary-accent">
        {step}
      </div>
      <div>
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-xs text-primary-accent">{description}</p>
      </div>
    </div>
  );
}

function ExplainView({ onNext }: { onNext: () => void }) {
  return (
    <div className="flex flex-col gap-5 p-6 duration-300 animate-in fade-in">
      <div>
        <DialogTitle className="text-lg font-semibold">
          Connect Wallet
        </DialogTitle>
        <DialogDescription className="mt-1 text-sm text-primary-accent">
          {`Start trading on the world's most private crypto exchange.`}
        </DialogDescription>
      </div>
      <div className="flex flex-col gap-4">
        <StepRow
          step={1}
          title="Add Twilight Chain"
          description="Add the nyks chain to your wallet and allow Twilight to connect to your wallet on nyks."
        />
        <StepRow
          step={2}
          title="Verify Ownership"
          description="Confirm you are the owner of this wallet."
        />
      </div>
      <Button onClick={onNext} size="default" className="w-full justify-center">
        Connect Wallet
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main modal
// ---------------------------------------------------------------------------

export default function WalletModal({
  state,
  connect,
  retry,
  reset,
}: WalletModalProps) {
  const { hasInit } = useTwilight();

  // null = not yet hydrated from localStorage, true = skip onboarding
  const [onboardingDismissed, setOnboardingDismissed] = useState<
    boolean | null
  >(null);

  // Once hasInit hydrates, decide whether to show onboarding
  const showOnboarding = onboardingDismissed === false;

  // Track hydration: when hasInit goes from "" to a truthy value, mark dismissed
  useEffect(() => {
    if (hasInit) {
      setOnboardingDismissed(true);
    } else if (hasInit === "") {
      // Still hydrating — wait for useLocalStorage useEffect
      // Only set false after a tick to distinguish "" (hydrating) from "" (genuinely empty)
    }
  }, [hasInit]);

  // After hydration settles, if still empty → first-time user
  useEffect(() => {
    if (onboardingDismissed !== null) return; // already decided
    // Small delay to let useLocalStorage hydrate
    const t = setTimeout(() => {
      setOnboardingDismissed((prev) => (prev === null ? false : prev));
    }, 50);
    return () => clearTimeout(t);
  }, [onboardingDismissed]);

  const [onboardingStep, setOnboardingStep] = useState<"welcome" | "explain">(
    "welcome"
  );

  // Show onboarding views for first-time users
  if (showOnboarding) {
    return (
      <DialogContent className="max-w-[90vw] gap-0 overflow-hidden p-0 md:max-w-[480px]">
        <DialogTitle className="sr-only">Connect Wallet</DialogTitle>
        <DialogDescription className="sr-only">
          Welcome to Twilight
        </DialogDescription>
        {onboardingStep === "welcome" && (
          <WelcomeView onNext={() => setOnboardingStep("explain")} />
        )}
        {onboardingStep === "explain" && (
          <ExplainView onNext={() => setOnboardingDismissed(true)} />
        )}
      </DialogContent>
    );
  }

  return (
    <DialogContent className="max-w-[90vw] gap-0 overflow-hidden p-0 md:max-w-[640px]">
      <DialogTitle className="sr-only">Connect Wallet</DialogTitle>
      <DialogDescription className="sr-only">
        Choose a wallet provider to connect
      </DialogDescription>

      {/* Desktop: split pane */}
      <div className="hidden md:flex md:min-h-[380px]">
        {/* Left — wallet list */}
        <div className="border-border/50 w-[260px] shrink-0 border-r">
          <p className="border-border/50 border-b px-4 py-3 text-sm font-semibold">
            Connect Wallet
          </p>
          <WalletList state={state} onSelect={connect} />
        </div>

        {/* Right — status pane */}
        <div className="flex flex-1 flex-col">
          <WalletStatePane state={state} onRetry={retry} onReset={reset} />
        </div>
      </div>

      {/* Mobile: stacked */}
      <div className="flex flex-col md:hidden">
        <p className="border-border/50 border-b px-4 py-3 text-sm font-semibold">
          Connect Wallet
        </p>
        <WalletList state={state} onSelect={connect} />

        {/* Show state pane below list when not idle */}
        {state.view !== "idle" && (
          <div className="border-border/50 border-t">
            <WalletStatePane state={state} onRetry={retry} onReset={reset} />
          </div>
        )}
      </div>
    </DialogContent>
  );
}
