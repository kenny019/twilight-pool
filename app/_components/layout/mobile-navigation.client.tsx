"use client";

import {
  Root,
  Trigger,
  Portal,
  Overlay,
  Content,
  Close,
} from "@radix-ui/react-dialog";
import { Menu, X } from "lucide-react";
import React, { useState } from "react";
import { Text } from "@/components/typography";
import Link from "next/link";
import { usePathname } from "next/navigation";
import cn from "@/lib/cn";
import { TWILIGHT_NETWORK_TYPE } from "@/lib/constants";
import { marketSubLinks, btcSubLinks } from "./nav-links";

const MobileNav = () => {
  const path = usePathname();
  const [open, setOpen] = useState(false);

  function MobileLink({
    href,
    text,
    external = false,
  }: {
    href: string;
    text: string;
    external?: boolean;
  }) {
    const isActive = !external && path === href;

    return (
      <Close asChild>
        <Link
          href={href}
          target={external ? "_blank" : undefined}
          rel={external ? "noreferrer" : undefined}
          onClick={() => setOpen(false)}
          className={cn(
            "focus-visible:ring-ring relative inline-flex min-h-[50px] w-full items-center px-4 py-2.5 text-[15px] font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 touch-manipulation",
            isActive
              ? "bg-theme/[0.04] text-primary"
              : "text-primary/80 hover:bg-primary/[0.03] hover:text-primary"
          )}
        >
          {isActive ? (
            <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-theme" />
          ) : null}
          <span className="block truncate">{text}</span>
        </Link>
      </Close>
    );
  }

  return (
    <Root open={open} onOpenChange={setOpen}>
      <Trigger asChild>
        <button className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md -mr-1 touch-manipulation transition-colors hover:bg-primary/5">
          <Menu className="h-5 w-5" />
        </button>
      </Trigger>

      <Portal>
        <Overlay className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Content
          className="fixed right-0 top-0 z-50 min-h-[100dvh] w-[calc(100vw-3.5rem)] max-w-[17.5rem] overflow-y-auto border-l bg-background px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-[calc(env(safe-area-inset-top)+0.75rem)] duration-300 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right"
        >
          <div className="flex items-center justify-between gap-3 border-b border-outline/30 pb-2.5">
            <Text className="font-ui text-[11px] uppercase tracking-[0.08em] text-primary/45">
              Menu
            </Text>
            <Close asChild>
              <button className="flex min-h-[36px] min-w-[36px] items-center justify-center rounded-md border border-outline/60 text-primary/55 transition-colors hover:bg-primary/5 hover:text-primary focus:outline-none focus:ring-1 focus:ring-primary touch-manipulation">
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </button>
            </Close>
          </div>

          <nav className="pt-3">
            <div className="overflow-hidden rounded-lg border border-outline/50 bg-background/40">
              {marketSubLinks.map((link, index) => (
                <div
                  key={link.href}
                  className={cn(index !== 0 && "border-t border-outline/35")}
                >
                  <MobileLink href={link.href} text={link.title} />
                </div>
              ))}
              {TWILIGHT_NETWORK_TYPE === "testnet" ? (
                <div className="border-t border-outline/35">
                  <MobileLink href="/faucet" text="Faucet" />
                </div>
              ) : (
                btcSubLinks.map((link) => (
                  <div key={link.href} className="border-t border-outline/35">
                    <MobileLink href={link.href} text={link.title} />
                  </div>
                ))
              )}
              <div className="border-t border-outline/35">
                <MobileLink
                  href="https://docs.twilight.org/"
                  text="Docs"
                  external
                />
              </div>
            </div>
          </nav>
        </Content>
      </Portal>
    </Root>
  );
};
export default MobileNav;
