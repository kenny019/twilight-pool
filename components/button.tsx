import React from "react";
import { Slot } from "@radix-ui/react-slot";
import cn from "@/lib/cn";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variantStyles;
  size?: keyof typeof sizeStyles;
  asChild?: boolean;
  className?: string;
  children: React.ReactNode;
}

const variantStyles = {
  primary: "btn-primary bg-button-primary rounded-default",
  secondary: `btn-secondary bg-button-secondary hover:bg-button-primary rounded-default transition-colors 
    duration-300 disabled:hover:bg-button-secondary`,
  link: "transition-colors underline underline-offset-2 hover:decoration-dashed p-0 disabled:no-underline hover:decoration-theme hover:text-theme",
  icon: `border border-primary bg-transparent rounded-full hover:border-transparent hover:bg-accent-200 dark:hover:bg-button-secondary
    disabled:bg-button-primary disabled:border-gray-500 disabled:hover:bg-button-primary dark:disabled:hover:bg-button-primary
  `,
  ui: `border hover:border-primary rounded-md py-0`,
} as const;

const sizeStyles = {
  default: "px-10 py-3 gap-2",
  small: "px-4 py-2 gap-2",
  icon: "p-3",
} as const;

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "default",
      asChild,
      className,
      children,
      ...props
    },
    ref
  ) => {
    return React.createElement(
      asChild ? Slot : "button",
      {
        className: cn(
          "flex relative justify-center items-center flex-shrink-0 disabled:text-gray-500 transition-colors duration-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary",
          sizeStyles[size],
          variantStyles[variant],
          className
        ),
        ref,
        ...props,
      },
      children
    );
  }
);

Button.displayName = "Button";

export default Button;
