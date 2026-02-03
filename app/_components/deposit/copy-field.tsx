"use client";
import { Input } from "@/components/input";
import { Copy, Check } from "lucide-react";
import { useState, useCallback } from "react";

type Props = {
  value: string;
  label: string;
  id?: string;
};

const CopyField = ({ value, label, id }: Props) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [value]);

  return (
    <div className="relative flex items-center justify-center">
      <Input
        id={id}
        readOnly
        value={value}
        className="select-all pr-10"
        onClick={(e) => e.currentTarget.select()}
        aria-label={label}
      />
      <button
        type="button"
        onClick={handleCopy}
        className="absolute right-3 p-1 rounded transition-colors text-primary-accent hover:text-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
        aria-label={copied ? "Copied" : `Copy ${label}`}
      >
        {copied ? (
          <Check className="h-4 w-4 text-green-500" />
        ) : (
          <Copy className="h-4 w-4" />
        )}
      </button>
    </div>
  );
};

export default CopyField;
