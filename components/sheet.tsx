"use client";

import React from "react";
import {
  Root,
  Trigger,
  Portal,
  Overlay,
  Content,
  Title,
  Description,
  Close,
  type DialogPortalProps,
} from "@radix-ui/react-dialog";
import cn from "@/lib/cn";
import { X } from "lucide-react";

const Sheet = Root;
const SheetTrigger = Trigger;

const SheetPortal = ({ ...props }: DialogPortalProps) => <Portal {...props} />;

const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof Overlay>,
  React.ComponentPropsWithoutRef<typeof Overlay>
>(({ className, ...props }, ref) => (
  <Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-background/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
));
SheetOverlay.displayName = Overlay.displayName;

const SheetContent = React.forwardRef<
  React.ElementRef<typeof Content>,
  React.ComponentPropsWithoutRef<typeof Content>
>(({ className, children, ...props }, ref) => (
  <SheetPortal>
    <SheetOverlay />
    <Content
      ref={ref}
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 flex w-full flex-col gap-4 rounded-t-xl border-t bg-background px-6 py-4",
        "max-h-[85dvh] overflow-y-auto pb-[env(safe-area-inset-bottom)]",
        "data-[state=open]:animate-in data-[state=closed]:animate-out",
        "data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
        "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        "duration-300",
        className
      )}
      {...props}
    >
      {children}
      <Close className="absolute right-4 top-4 rounded-md border-0 opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-1 focus:ring-primary disabled:pointer-events-none">
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </Close>
    </Content>
  </SheetPortal>
));
SheetContent.displayName = Content.displayName;

const SheetTitle = React.forwardRef<
  React.ElementRef<typeof Title>,
  React.ComponentPropsWithoutRef<typeof Title>
>(({ className, ...props }, ref) => (
  <Title
    ref={ref}
    className={cn("text-lg font-semibold leading-none tracking-tight", className)}
    {...props}
  />
));
SheetTitle.displayName = Title.displayName;

const SheetDescription = React.forwardRef<
  React.ElementRef<typeof Description>,
  React.ComponentPropsWithoutRef<typeof Description>
>(({ className, ...props }, ref) => (
  <Description
    ref={ref}
    className={cn("text-sm text-primary/60", className)}
    {...props}
  />
));
SheetDescription.displayName = Description.displayName;

export { Sheet, SheetTrigger, SheetContent, SheetTitle, SheetDescription };
