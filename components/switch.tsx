"use client";
import React from "react";
import { Root, Thumb } from "@radix-ui/react-switch";
import cn from "@/lib/cn";

const Switch = React.forwardRef<
  React.ElementRef<typeof Root>,
  React.ComponentPropsWithoutRef<typeof Root>
>(({ className, ...props }, ref) => (
  <Root
    className={cn(
      "focus-visible:ring-ring peer inline-flex h-[20px] w-[36px] shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-theme data-[state=unchecked]:bg-gray-300 data-[state=unchecked]:dark:bg-gray-500",
      className
    )}
    ref={ref}
    {...props}
  >
    <Thumb
      className={
        "pointer-events-none block h-4 w-4 rounded-full bg-white shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0"
      }
    />
  </Root>
));

Switch.displayName = Root.displayName;

export default Switch;
