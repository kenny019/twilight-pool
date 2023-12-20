"use client";
import cn from "@/lib/cn";
import React, { useCallback, useEffect, useId, useRef, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import Big from "big.js";

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

interface NumberInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  step?: number;
  minValue?: number;
  maxValue?: number;
}

const NumberInput = ({
  className,
  step = 1,
  defaultValue,
  minValue = 0,
  maxValue = Number.MAX_SAFE_INTEGER,
  ...props
}: NumberInputProps) => {
  const id = useId();

  const [inputValue, setInputValue] = useState(0);

  const inputRef = useCallback(
    (node: HTMLInputElement) => {
      if (node === null) return null;

      node.value = inputValue.toString();
      return node;
    },
    [inputValue]
  );

  const currentValue = Big(inputValue);
  const canIncrement = currentValue.minus(step).lte(maxValue);
  const canDecrement = currentValue.minus(step).gte(minValue);

  function modifyValueByStep(
    event: React.MouseEvent<HTMLButtonElement, MouseEvent>
  ) {
    event.preventDefault();
    const currentValue = Big(inputValue);

    const action = event.currentTarget.id.includes("increment")
      ? "increment"
      : "decrement";

    if (action === "increment" && canIncrement) {
      const newValue = currentValue.plus(step);
      setInputValue(newValue.toNumber());
      return;
    }

    if (action === "decrement" && canDecrement) {
      const newValue = currentValue.minus(step);
      setInputValue(newValue.toNumber());
      return;
    }
  }

  return (
    <div className="relative flex w-full">
      <Input
        id={id}
        defaultValue={defaultValue || 0}
        type="number"
        className={className}
        ref={inputRef}
        onChange={(e) => setInputValue(Big(e.target.value || 0).toNumber())}
        {...props}
      />
      <div className="absolute inset-y-0 right-0 mt-[1px] flex h-[calc(100%-2px)] flex-col items-center justify-center border-l">
        <button
          id={`${id}-increment`}
          onClick={modifyValueByStep}
          className="z-10 flex h-full items-center justify-center border-b px-1.5 text-sm text-primary-accent hover:text-primary disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:text-primary-accent"
          disabled={!canIncrement}
        >
          <ChevronUp className="h-4 w-4" />
        </button>
        <button
          id={`${id}-decrement`}
          onClick={modifyValueByStep}
          className="z-10 flex h-full items-center justify-center px-1.5 text-sm text-primary-accent hover:text-primary disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:text-primary-accent"
          disabled={!canDecrement}
        >
          <ChevronDown className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

NumberInput.displayName = "Input";

interface PopoverInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  options: string[];
  onClickPopover: React.MouseEventHandler<HTMLButtonElement>;
  selected: string;
  setSelected: React.Dispatch<React.SetStateAction<string>>;
}

const PopoverInput = React.forwardRef<HTMLInputElement, PopoverInputProps>(
  (
    { className, options, selected, setSelected, onClickPopover, ...props },
    ref
  ) => {
    const [popoverOpen, setPopoverOpen] = useState(false);

    const [popoverOpenState, setPopoverOpenState] = useState("closed");
    const popoverRefCallback = useCallback((node: HTMLButtonElement) => {
      if (node !== null) {
        setPopoverOpenState(node.dataset.state || "closed");
      }
    }, []);

    return (
      <div className="relative">
        <Input autoComplete="off" ref={ref} {...props} className={className} />

        <div className="absolute inset-y-0 right-0 mt-[1px] flex h-[calc(100%-2px)] flex-col items-center justify-center border-l">
          <Popover
            defaultOpen={false}
            open={popoverOpen}
            onOpenChange={setPopoverOpen}
          >
            <PopoverTrigger asChild>
              <button
                ref={popoverRefCallback}
                className="z-10 flex h-full items-center justify-center px-1.5 font-ui text-xs text-primary opacity-60 data-[state=open]:opacity-90"
              >
                <p>{selected}</p>{" "}
                <ChevronDown
                  data-state={popoverOpenState}
                  className="h-[12px] w-[12px] rotate-0 transition-all data-[state=open]:rotate-180"
                />
              </button>
            </PopoverTrigger>
            <PopoverContent
              sideOffset={4}
              side={"bottom"}
              align={"end"}
              className="flex w-full flex-col items-start justify-start rounded-md px-0.5 py-1 font-ui text-xs text-primary"
            >
              {options.map((option, index) => (
                <button
                  className={cn(
                    option === selected ? "hidden" : "",
                    " w-full rounded-md px-1 py-1 text-start hover:bg-green hover:text-black"
                  )}
                  key={index}
                  value={option}
                  onClick={(e) => {
                    onClickPopover(e);
                    setSelected(option);
                    setPopoverOpen(false);
                  }}
                >
                  {option}
                </button>
              ))}
            </PopoverContent>
          </Popover>
        </div>
      </div>
    );
  }
);

PopoverInput.displayName = "Input";

export { Input, NumberInput, PopoverInput };
