"use client";
import cn from "@/lib/cn";
import React, { useId, useRef } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-primary-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export interface NumberInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  step?: number;
}

const NumberInput = ({
  className,
  step = 1,
  defaultValue,
  ...props
}: NumberInputProps) => {
  const id = useId();
  const ref = useRef<HTMLInputElement>(null);

  function modifyValueByStep(
    event: React.MouseEvent<HTMLButtonElement, MouseEvent>
  ) {
    event.preventDefault();
    if (!ref || !ref.current) return;

    // todo: get library to handle floats and large ints
    if (event.currentTarget.id.includes("increment")) {
      ref.current.value = (parseFloat(ref.current.value) + step).toString();
      return;
    }

    ref.current.value = (parseFloat(ref.current.value) - step).toString();
  }

  return (
    <div className="relative">
      <Input
        id={id}
        defaultValue={defaultValue || 0}
        type="number"
        className={className}
        ref={ref}
        {...props}
      />
      <div className="absolute inset-y-0 right-0 mt-[1px] flex h-[calc(100%-2px)] flex-col items-center justify-center border-l">
        <button
          id={`${id}-increment`}
          onClick={modifyValueByStep}
          className="z-10 flex h-full items-center justify-center border-b px-1.5 text-sm text-primary-accent hover:text-primary"
        >
          <ChevronUp className="h-4 w-4" />
        </button>
        <button
          id={`${id}-decrement`}
          onClick={modifyValueByStep}
          className="z-10 flex h-full items-center justify-center px-1.5 text-sm text-primary-accent hover:text-primary"
        >
          <ChevronDown className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

NumberInput.displayName = "Input";

export { Input, NumberInput };
