import cn from "@/lib/cn";
import { Slot } from "@radix-ui/react-slot";
import React from "react";

type Headings = "h1" | "h2" | "h3";

type Props = {
  heading?: Headings;
  className?: string;
  feature?: boolean;
  asChild?: boolean;
  children: React.ReactNode;
};

const headingStyles = {
  h1: "text-4xl font-extrabold",
  h2: "text-3xl font-semibold",
  h3: "text-2xl font-semibold",
} as const;

const Text = ({ heading, className, feature, asChild, children }: Props) => {
  if (heading) {
    return React.createElement(
      asChild ? Slot : heading,
      {
        className: cn(
          headingStyles[heading],
          feature ? "font-feature" : "font-body",
          "scroll-m-20 tracking-tight mb-4",
          className
        ),
      },
      children
    );
  }

  return React.createElement(
    asChild ? Slot : "p",
    {
      className: cn("font-body leading-6", className),
    },
    children
  );
};

export { Text };
