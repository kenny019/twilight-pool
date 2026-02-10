import { CheckCircle2, ChevronRight } from "lucide-react";

const WithdrawalInfo = () => {
  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div>
        <p className="text-lg font-semibold">
          Select the Correct Reserve ID
        </p>
        <p className="mt-1 text-sm text-primary-accent leading-relaxed">
          Withdrawals must be requested using the same Reserve ID you used at
          the time of deposit. The Reserve ID is the primary reference for your
          funds throughout the withdrawal process.
        </p>
        <p className="mt-2 text-sm text-primary-accent leading-relaxed">
          You do not need to account for Reserve Address updates. The system
          will process your withdrawal based on the selected Reserve ID.
        </p>
      </div>

      {/* How Withdrawals Are Processed */}
      <div className="space-y-2">
        <p className="text-sm font-semibold">How Withdrawals Are Processed</p>
        <div className="space-y-1.5">
          {[
            "Withdrawal requests are processed in batches.",
            "Withdrawals are processed on a daily settlement cycle.",
          ].map((text, i) => (
            <div key={i} className="flex gap-2 items-start">
              <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-theme" />
              <p className="text-sm text-primary-accent">{text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Fees */}
      <div className="space-y-2">
        <p className="text-sm font-semibold">Fees</p>
        <div className="space-y-1.5">
          {[
            "The final amount received will be subject to Bitcoin network fees.",
            "Fees are deducted automatically at the time of withdrawal.",
          ].map((text, i) => (
            <div key={i} className="flex gap-2 items-start">
              <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-theme" />
              <p className="text-sm text-primary-accent">{text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Before You Submit — checklist */}
      <div className="space-y-2">
        <p className="text-sm font-semibold">Before You Submit</p>
        <div className="space-y-1.5">
          {[
            "Reserve ID matches your original deposit.",
            "Withdrawal amount is correct.",
          ].map((text, i) => (
            <div key={i} className="flex gap-2 items-start">
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green-500" />
              <p className="text-sm text-primary-accent">{text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WithdrawalInfo;
