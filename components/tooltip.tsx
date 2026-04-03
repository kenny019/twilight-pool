"use client";

import * as React from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/popover";
import { Text } from "@/components/typography";
import { Info } from "lucide-react";
import cn from "@/lib/cn";

type TooltipProps = {
  title: string;
  body: string;
  children: React.ReactNode;
  className?: string;
};

export function Tooltip({ title, body, children, className }: TooltipProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <span
          className={cn("inline-flex cursor-help items-center gap-1 touch-manipulation", className)}
          onMouseEnter={() => setIsOpen(true)}
          onMouseLeave={() => setIsOpen(false)}
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen((prev) => !prev);
          }}
        >
          {children}
          <Info className="h-3.5 w-3.5 shrink-0 text-primary-accent" />
        </span>
      </PopoverTrigger>
      <PopoverContent
        className="max-w-xs bg-background/95 px-3 py-2 text-xs"
        side="top"
        align="start"
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
      >
        <Text className="font-medium text-primary">{title}</Text>
        <Text className="mt-1 text-primary-accent">{body}</Text>
      </PopoverContent>
    </Popover>
  );
}
