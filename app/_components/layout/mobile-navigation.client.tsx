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

  function MobileLink({ href, text }: { href: string; text: string }) {
    return (
      <div>
        <Link passHref href={href}>
          <button
            className={cn(
              "focus-visible:ring-ring inline-flex h-11 w-full items-center justify-normal rounded-md border px-2 py-0 text-sm ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 md:animate-in",
              path === href ? "border-theme" : "border-outline"
            )}
            onClick={() => setOpen(false)}
          >
            {text}
          </button>
        </Link>
      </div>
    );
  }

  return (
    <Root open={open} onOpenChange={setOpen}>
      <Trigger asChild>
        <button className="flex min-h-[44px] min-w-[44px] items-center justify-center -mr-2 touch-manipulation">
          <Menu className="h-5 w-5" />
        </button>
      </Trigger>

      <Portal>
        <Overlay className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Content
          className="fixed right-0 top-0 z-50 min-h-dvh w-full max-w-xs border-l bg-background px-6 py-4 duration-300 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right"
        >
          <Close className="absolute right-2 top-2 flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md border-0 opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-1 focus:ring-primary disabled:pointer-events-none touch-manipulation">
            <X className="h-5 w-5" />
            <span className="sr-only">Close</span>
          </Close>
          <div className="space-y-4 pt-8">
            <div className="space-y-1">
              <Text className="font-ui text-xs uppercase text-primary/80">
                Links
              </Text>
              <div className="space-y-2">
                {marketSubLinks.map((link) => (
                  <MobileLink
                    key={link.href}
                    href={link.href}
                    text={link.title}
                  />
                ))}
                {TWILIGHT_NETWORK_TYPE === "testnet" ? (
                  <MobileLink href="/faucet" text="Faucet" />
                ) : (
                  btcSubLinks.map((link) => (
                    <MobileLink
                      key={link.href}
                      href={link.href}
                      text={link.title}
                    />
                  ))
                )}
                <MobileLink
                  href="https://docs.twilight.org/"
                  text="Docs"
                />
              </div>
            </div>
          </div>
        </Content>
      </Portal>
    </Root>
  );
};

export default MobileNav;
