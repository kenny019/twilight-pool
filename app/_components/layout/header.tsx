import Logo from "@/components/logo";
import { Separator } from "@/components/seperator";
import Link from "next/link";
import React from "react";
import MultiLink from "./multi-link.client";
import { ArrowUpRight } from "lucide-react";
import ConnectWallet from "./connect-wallet.client";
import Settings from "./settings.client";
import SubaccountSelect from "./subaccount/subaccount-select.client";

const marketSubLinks = [
  {
    href: "/lend",
    title: "Lend",
  },
  {
    href: "/wallet",
    title: "Wallet",
  },
] as const;

const btcSubLinks = [
  {
    href: "/registration",
    title: "Register",
  },
  {
    href: "/verification",
    title: "Verify",
  },
  {
    href: "/withdrawal",
    title: "Withdraw",
  },
] as const;

const Header = () => {
  return (
    <nav className="border-b">
      <div className="mx-auto px-4 py-4">
        <div className="relative flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/">
              <Logo className="hover:opacity-80" />
            </Link>
            <div className="hidden items-center lg:flex">
              <div className="flex items-center space-x-1">
                <MultiLink title="Trade" subLinks={marketSubLinks} />
                <MultiLink title="Bitcoin" subLinks={btcSubLinks} />
              </div>
              <Separator className="mr-6 h-5" orientation="vertical" />
              <div className="flex items-center space-x-6">
                <Link
                  href="https://docs.twilight.finance/"
                  className="flex dark:text-gray-400 dark:hover:text-primary"
                  target="_blank"
                >
                  Docs <ArrowUpRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>

          {/* right side */}
          <div className="flex flex-row items-center space-x-4">
            <SubaccountSelect />
            <Settings />
            <ConnectWallet />
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Header;
