"use client";

import React from "react";
import {
  Root as DropdownMenu,
  Trigger as DropdownTrigger,
  Group as DropdownGroup,
  Portal as DropdownPortal,
  Content,
  Item,
  Label,
  Separator,
} from "@radix-ui/react-dropdown-menu";
import cn from "@/lib/cn";

const DropdownContent = React.forwardRef<
  React.ElementRef<typeof Content>,
  React.ComponentPropsWithoutRef<typeof Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <DropdownPortal>
    <Content
      ref={ref}
      className={cn(
        "z-50 min-w-[8rem] overflow-hidden rounded-md border border-transparent bg-white p-2 text-primary before:absolute before:inset-0 before:-z-10 before:mx-[-1px] before:my-[-1px] before:rounded-md before:bg-gradient-to-b before:from-gray-500 before:to-gray-300 before:to-70% dark:bg-background dark:before:from-white dark:before:to-gray-500",
        " data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        className
      )}
      {...props}
    />
  </DropdownPortal>
));

DropdownContent.displayName = Content.displayName;

const DropdownItem = React.forwardRef<
  React.ElementRef<typeof Item>,
  React.ComponentPropsWithoutRef<typeof Item>
>(({ className, ...props }, ref) => (
  <Item
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center rounded-md px-2 py-1.5 text-sm outline-none transition-colors data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    )}
    {...props}
  />
));

DropdownItem.displayName = Item.displayName;

const DropdownLabel = React.forwardRef<
  React.ElementRef<typeof Label>,
  React.ComponentPropsWithoutRef<typeof Label>
>(({ className, ...props }, ref) => (
  <Label
    ref={ref}
    className={cn("px-2 py-1.5 text-sm font-semibold", className)}
    {...props}
  />
));

DropdownLabel.displayName = Label.displayName;

const DropdownSeparator = React.forwardRef<
  React.ElementRef<typeof Separator>,
  React.ComponentPropsWithoutRef<typeof Separator>
>(({ className, ...props }, ref) => (
  <Separator
    ref={ref}
    className={cn("-mx-1 my-1 h-px", className)}
    {...props}
  />
));

DropdownSeparator.displayName = Separator.displayName;

export {
  DropdownMenu,
  DropdownTrigger,
  DropdownGroup,
  DropdownPortal,
  DropdownContent,
  DropdownItem,
  DropdownLabel,
  DropdownSeparator,
};
