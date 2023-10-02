"use client";
import Logo from "@/components/logo";
import { ThemeSwitch } from "@/components/theme-switch";
import Link from "next/link";
import React from "react";

const coreItems = [
  {
    title: "Colors",
    href: "colors",
  },
  {
    title: "Typography",
    href: "typography",
  },
];

const componentItems = [
  {
    title: "Button",
    href: "button",
  },
  {
    title: "Dropdown",
    href: "dropdown",
  },
  {
    title: "Toggle",
    href: "toggle",
  },
  {
    title: "Checkbox",
    href: "checkbox",
  },
  {
    title: "Input",
    href: "input",
  },
];

const CategoryNav = ({ children }: { children: React.ReactNode }) => {
  return (
    <p className="px-4 py-4 font-ui text-xs uppercase tracking-[.125rem] text-accent-400 dark:text-accent-100">
      {children}
    </p>
  );
};

const ComponentsSidebar = () => {
  return (
    <div className="hidden md:flex md:flex-shrink-0">
      <div className="flex w-60 flex-col">
        <div className="flex h-0 flex-1 flex-col border-r">
          <div className="flex flex-1 flex-col overflow-y-auto pb-4 pt-6">
            <div className="flex flex-shrink-0 items-center px-4">
              <Link href="/">
                <Logo className="hover:opacity-80" />
              </Link>
            </div>
            {/* todo: refactor sidebar to be server component and nav unit as client*/}
            <nav className="flex-1 space-y-4 pt-6">
              <div>
                <CategoryNav>Core</CategoryNav>
                {coreItems.map((item, index) => (
                  <Link key={index} href={`/design/core/${item.href}`}>
                    <div className="cursor-pointer rounded-md px-4 py-2 font-body text-sm text-accent-400 hover:bg-green dark:text-accent-300 dark:hover:text-black">
                      {item.title}
                    </div>
                  </Link>
                ))}
              </div>
              <div>
                <CategoryNav>Components</CategoryNav>
                {componentItems.map((item, index) => (
                  <Link key={index} href={`/design/components/${item.href}`}>
                    <div className="cursor-pointer rounded-md px-4 py-2 font-body text-sm text-accent-400 hover:bg-green dark:text-accent-300 dark:hover:text-black">
                      {item.title}
                    </div>
                  </Link>
                ))}
              </div>
              <div className="pl-2">
                <ThemeSwitch
                  className="ml-2 before:ml-[7px]"
                  align="center"
                  side="left"
                />
              </div>
            </nav>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComponentsSidebar;
