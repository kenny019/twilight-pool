"use client";

import * as React from "react";
import { Root, Indicator } from "@radix-ui/react-checkbox";
import { Check } from "lucide-react";
import cn from "@/lib/cn";

const Checkbox = React.forwardRef<
  React.ElementRef<typeof Root>,
  React.ComponentPropsWithoutRef<typeof Root>
>(({ className, ...props }, ref) => (
  <Root
    className={cn(
      "peer h-4 w-4 shrink-0 rounded-sm border shadow focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-button-primary",
      className
    )}
    ref={ref}
    {...props}
  >
    <Indicator className="flex items-center justify-center">
      <Check className="h-4 w-4" />
    </Indicator>
  </Root>
));

Checkbox.displayName = Root.displayName;

export default Checkbox;
