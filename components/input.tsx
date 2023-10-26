"use client";
import cn from "@/lib/cn";
import React, { useCallback, useEffect, useId, useRef, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

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
        <Input ref={ref} {...props} className={cn(className)} />

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
              className="flex w-full flex-col items-start justify-start space-y-2 rounded-md px-1 py-1 font-ui text-xs text-primary"
            >
              {options.map((option, index) => (
                <button
                  className="w-full rounded-md px-1 py-0.5 hover:bg-green hover:text-black"
                  key={index}
                  onClick={(e) => {
                    setSelected(option);
                    onClickPopover(e);
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
