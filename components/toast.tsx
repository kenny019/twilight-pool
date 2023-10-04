import React from 'react'
import { X } from "lucide-react";
import {
	Provider,
	Viewport,
	Root,
	Close,
	Title,
	Description
} from "@radix-ui/react-toast";
import cn from '@/lib/cn';


const ToastProvider = Provider;

const ToastViewport = React.forwardRef<
  React.ElementRef<typeof Viewport>,
  React.ComponentPropsWithoutRef<Viewport>
>(({ className, ...props }, ref) => (
  <Viewport
    ref={ref}
    className={cn(
      "fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]",
      className
    )}
    {...props}
  />
))
ToastViewport.displayName = Viewport.displayName

enum variantStyles {
	default= "border bg-background",
	error= "group border-red bg-red",
	success= "border-green bg-green",
}

interface Props extends React.ComponentPropsWithoutRef<Root> {
	variant: keyof typeof variantStyles;
}

const Toast = React.forwardRef<
  React.ElementRef<typeof Root>,
  Props
>(({ className, variant="default", ...props }, ref) => {
  return (
    <Root
      ref={ref}
      className={cn("group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border p-6 pr-8 transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-bottom-full",
	  variantStyles[variant], className)}
      {...props}
    />
  )
})
Toast.displayName = Root.displayName

const ToastClose = React.forwardRef<
  React.ElementRef<typeof Close>,
  React.ComponentPropsWithoutRef<typeof Close>
>(({ className, ...props }, ref) => (
  <Close
    ref={ref}
    className={cn(
      "absolute right-2 top-2 rounded-md p-1 text-primary-accent opacity-0 transition-opacity hover:text-primary focus:opacity-100 focus:outline-none focus:ring-2 group-hover:opacity-100",
      className
    )}
    toast-close=""
    {...props}
  >
    <X className="h-4 w-4" />
  </Close>
))
ToastClose.displayName = Close.displayName

const ToastTitle = React.forwardRef<
  React.ElementRef<typeof Title>,
  React.ComponentPropsWithoutRef<typeof Title>
>(({ className, ...props }, ref) => (
  <Title
    ref={ref}
    className={cn("text-sm font-semibold", className)}
    {...props}
  />
))
ToastTitle.displayName = Title.displayName

const ToastDescription = React.forwardRef<
  React.ElementRef<typeof Description>,
  React.ComponentPropsWithoutRef<typeof Description>
>(({ className, ...props }, ref) => (
  <Description
    ref={ref}
    className={cn("text-sm opacity-90", className)}
    {...props}
  />
))
ToastDescription.displayName = Description.displayName

type ToastProps = React.ComponentPropsWithoutRef<typeof Toast>;

export {
  type ToastProps,
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
}