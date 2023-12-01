"use client";

import * as React from "react";
import { Root, List, Trigger } from "@radix-ui/react-tabs";
import cn from "@/lib/cn";

type TabProps = {
  variant?: "default" | "underline" | "ghost";
};

const Tabs = Root;

const TabsListStyle = {
  default: "bg-tabs-background dark:text-accent-300 rounded-md p-2 h-9",
  underline: "space-x-4",
  ghost: "space-x-4",
} as const;

const TabsList = React.forwardRef<
  React.ElementRef<typeof List>,
  React.ComponentPropsWithoutRef<typeof List> & TabProps
>(({ className, variant = "default", ...props }, ref) => (
  <List
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center",
      TabsListStyle[variant],
      className
    )}
    {...props}
  />
));

TabsList.displayName = List.displayName;

const TabsTriggerStyle = {
  default:
    "data-[state=active]:bg-tabs-accent data-[state=active]:text-background rounded-md px-3 py-1",
  underline:
    "data-[state=active]:border-theme border-b border-transparent duration-300 text-sm border-b-2 hover:opacity-80",
  ghost:
    "data-[state=active]:opacity-100 opacity-50 hover:opacity-80 duration-300 px-2",
};

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof Trigger>,
  React.ComponentPropsWithoutRef<typeof Trigger> & TabProps
>(({ className, variant = "default", ...props }, ref) => (
  <Trigger
    ref={ref}
    className={cn(
      "inline-flex select-none items-center justify-center whitespace-nowrap transition-all disabled:pointer-events-none disabled:opacity-50",
      TabsTriggerStyle[variant],
      className
    )}
    {...props}
  />
));

TabsTrigger.displayName = Trigger.displayName;

export { Tabs, TabsList, TabsTrigger };
