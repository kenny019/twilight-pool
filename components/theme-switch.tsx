"use client";

import * as React from "react";
import { useTheme } from "next-themes";

import Button from "@/components/button";
import {
  DropdownMenu,
  DropdownContent,
  DropdownItem,
  DropdownTrigger,
} from "@/components/dropdown";
import { Moon, Sun } from "lucide-react";

type Props = {
  className: string;
  side: "bottom" | "left" | "right" | "top";
  align: "center" | "end" | "start";
};

export function ThemeSwitch({ className, side, align }: Props) {
  const { setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownTrigger asChild>
        <Button
          variant="icon"
          className="data-[state=open]:border-transparent data-[state=open]:bg-accent-200 data-[state=open]:dark:bg-button-secondary"
          size="icon"
        >
          <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-transform dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownTrigger>
      <DropdownContent side={side} className={className} align={align}>
        <DropdownItem
          className="cursor-pointer hover:bg-green hover:text-black"
          onClick={() => setTheme("light")}
        >
          Light
        </DropdownItem>
        <DropdownItem
          className="cursor-pointer hover:bg-green hover:text-black"
          onClick={() => setTheme("dark")}
        >
          Dark
        </DropdownItem>
      </DropdownContent>
    </DropdownMenu>
  );
}
