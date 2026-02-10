import { AlertTriangle, CheckCircle2, ChevronRight, Clock } from "lucide-react";

const VerificationInfo = () => {
  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div>
        <p className="text-lg font-semibold">
          Send BTC to the Active Reserve Address
        </p>
        <p className="mt-1 text-sm text-primary-accent leading-relaxed">
          Each reserve address is a temporary multisig vault secured by the
          Twilight validator set. Deposits are swept into the protocol after
          confirmation.
        </p>
      </div>

      {/* Yellow callout — time-sensitive */}
      <div className="flex items-start gap-2 rounded border border-yellow-500/50 bg-yellow-500/10 p-3 text-xs text-yellow-500">
        <Clock className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          The Reserve Address must be <strong>active</strong> (not expired) when
          your transaction confirms on-chain. Check the expiry ring before
          sending.
        </span>
      </div>

      {/* How Reserves Work */}
      <div className="space-y-2">
        <p className="text-sm font-semibold">How Reserves Work</p>
        <div className="space-y-1.5">
          {[
            "Twilight rotates reserve addresses every ~144 Bitcoin blocks (~24 h).",
            "Each address is a threshold-signature vault backed by the validator set.",
            "Once your deposit confirms, oracles detect it and credit your Twilight balance.",
          ].map((text, i) => (
            <div key={i} className="flex gap-2 items-start">
              <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-theme" />
              <p className="text-sm text-primary-accent">{text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* After You Send */}
      <div className="space-y-2">
        <p className="text-sm font-semibold">After You Send</p>
        <div className="space-y-1.5">
          {[
            "Wait for at least 1 Bitcoin confirmation (~10 min).",
            "Twilight oracles will detect your deposit and credit your balance automatically.",
            "Verification can take 30 minutes or longer. Check the Wallet page for updates.",
          ].map((text, i) => (
            <div key={i} className="flex gap-2 items-start">
              <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-theme" />
              <p className="text-sm text-primary-accent">{text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Save Your Reserve ID */}
      <div className="space-y-2">
        <p className="text-sm font-semibold">Save Your Reserve ID</p>
        <div className="space-y-1.5">
          {[
            "The Reserve ID links your deposit to the correct vault.",
            "You will need it when you request a withdrawal.",
            "Copy or write it down before leaving this page.",
          ].map((text, i) => (
            <div key={i} className="flex gap-2 items-start">
              <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-theme" />
              <p className="text-sm text-primary-accent">{text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Before You Send — checklist */}
      <div className="space-y-2">
        <p className="text-sm font-semibold">Before You Send</p>
        <div className="space-y-1.5">
          {[
            "Reserve address is active (expiry ring is green or yellow).",
            "Sending from the registered BTC address shown above.",
            "Amount matches the exact deposit amount displayed.",
            "Using a Native SegWit (bc1q...) wallet.",
            "Reserve ID has been saved or copied.",
          ].map((text, i) => (
            <div key={i} className="flex gap-2 items-start">
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green-500" />
              <p className="text-sm text-primary-accent">{text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Red callout — expired warning */}
      <div className="flex items-start gap-2 rounded border border-red-500/50 bg-red-500/10 p-3 text-xs text-red-500">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          Never send BTC to an expired reserve address. Funds sent after expiry
          may be delayed or require manual recovery by the validator set.
        </span>
      </div>
    </div>
  );
};

export default VerificationInfo;
