"use client";

import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/dialog";
import { Menu } from "lucide-react";
import React, { useState } from "react";
import ConnectWallet from "./connect-wallet.client";
import SubaccountSelect from "./subaccount/subaccount-select.client";
import { Text } from "@/components/typography";
import Link from "next/link";
import Button from "@/components/button";
import { usePathname } from "next/navigation";
import cn from "@/lib/cn";

const MobileNav = () => {
  const path = usePathname();
  const [open, setOpen] = useState(false);

  function MobileLink({ href, text }: { href: string; text: string }) {
    return (
      <div>
        <Link passHref href={href}>
          <button
            className={cn(
              "focus-visible:ring-ring inline-flex h-10 w-full items-center justify-normal rounded-md border px-2 py-0 text-sm ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 md:animate-in",
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button>
          <Menu />
        </button>
      </DialogTrigger>

      <DialogContent className="left-auto right-0 min-h-screen max-w-xs translate-x-0 rounded-none border-r-0">
        <div className="space-y-4">
          <div className="space-y-1">
            <Text className="font-ui text-xs uppercase text-primary/80">
              Trade
            </Text>

            <div className="space-y-2">
              <MobileLink href="/wallet" text="Wallet" />
              <MobileLink href="/lend" text="Lend" />
            </div>
          </div>
          <div className="space-y-1">
            <Text className="font-ui text-xs uppercase text-primary/80">
              Bitcoin
            </Text>

            <div className="space-y-2">
              <MobileLink href="/registration" text="Register" />
              <MobileLink href="/verification" text="Verify" />
              <MobileLink href="/withdrawal" text="Withdraw" />
            </div>
          </div>

          <div className="space-y-1">
            <Text className="font-ui text-xs uppercase text-primary/80">
              Accounts
            </Text>
            <SubaccountSelect />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MobileNav;
