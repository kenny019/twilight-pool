"use client";
import cn from "@/lib/cn";
import Link from "next/link";
import React, { useState } from "react";
import { ChevronUp } from "lucide-react";

type SubLink = {
  title: string;
  href: string;
};

type Props = {
  title: string;
  subLinks: Readonly<SubLink[]>;
  className?: string;
  target?: React.HTMLAttributeAnchorTarget;
};

// todo: repurpose for select menu
const MultiLink = ({ title, subLinks, className, target }: Props) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div
      className={cn("relative z-10 bg-background", className)}
      data-state={isOpen ? "open" : "closed"}
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <button
        className={cn(
          "flex items-center justify-start gap-[6px] rounded-md rounded-b-none border border-b-0 border-transparent px-5 py-2 focus-visible:outline-none data-[state=open]:border-primary",
          className
        )}
        data-state={isOpen ? "open" : "closed"}
        onClick={() => setIsOpen(!isOpen)}
      >
        {title}
        <ChevronUp
          className={cn(
            "h-4 w-4 transition-all",
            isOpen ? "rotate-0" : "rotate-180"
          )}
        />
      </button>
      <div
        className={cn(
          "absolute inset-x-0 mx-[1px] rounded-b-md bg-background pt-2 text-gray-400",
          "transition-opacity before:absolute before:inset-0 before:-z-10 before:mx-[-1px] before:mb-[-1px] before:rounded-b-md before:bg-gradient-to-b before:from-gray-500 before:to-gray-300 before:to-70% before:duration-300 dark:bg-background dark:before:from-white dark:before:to-gray-500",
          isOpen ? "block" : "hidden"
        )}
      >
        {subLinks.map((link) => (
          <Link
            className="flex w-full rounded-md px-5 py-1 hover:bg-green hover:text-black"
            key={link.title}
            href={link.href}
            target={target}
          >
            {link.title}
          </Link>
        ))}
      </div>
    </div>
  );
};

export default MultiLink;
