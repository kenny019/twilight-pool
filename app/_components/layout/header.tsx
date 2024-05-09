import Logo from "@/components/logo";
import { Separator } from "@/components/seperator";
import Link from "next/link";
import React from "react";
import MultiLink from "./multi-link.client";
import { ArrowUpRight } from "lucide-react";
import ConnectWallet from "./connect-wallet.client";
import Settings from "./settings.client";
import SubaccountSelect from "./subaccount/subaccount-select.client";
import MobileNav from "./mobile-navigation.client";

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

const SetupGuideLinks = [
  {
    href: "/btc-deposit-flow",
    title: "BTC Deposit Flow",
  },
  {
    href: "/dex-operations",
    title: "DEX Operations",
  },
  {
    href: "/lend-to-twilight-pool",
    title: "Lend To Twilight Pool",
  },
];

const Header = () => {
  return (
    <nav className="border-b">
      <div className="mx-auto px-1 py-2 md:px-4 md:py-4">
        <div className="relative hidden items-center justify-between md:flex">
          <div className="flex items-center space-x-2 md:space-x-4">
            <Link className="hidden sm:block" href="/">
              <Logo className="hover:opacity-80" />
            </Link>
            <div className="hidden items-center lg:flex">
              <div className="flex items-center space-x-1">
                <MultiLink title="Trade" subLinks={marketSubLinks} />
                <MultiLink title="Funds" subLinks={btcSubLinks} />
              </div>
              <Separator className="mr-6 h-5" orientation="vertical" />
              <div className="flex items-center space-x-4">
                <MultiLink
                  className={"min-w-[200px] justify-between"}
                  target={"_blank"}
                  title="Setup Guides"
                  subLinks={SetupGuideLinks}
                />
                <Link
                  href="https://docs.twilight.org/"
                  className="flex dark:text-gray-400 dark:hover:text-primary"
                >
                  Specs <ArrowUpRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>

          {/* right side */}
          <div className="mx-auto flex flex-row items-center space-x-2 sm:mx-0 md:space-x-4">
            <SubaccountSelect />
            <ConnectWallet />
            <Settings />
          </div>
        </div>
        <div className="relative flex items-center justify-between px-2 md:hidden">
          <Link href="/">
            <Logo className="w-6" />
          </Link>
          <div className="flex space-x-4">
            <ConnectWallet />
            <MobileNav />
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Header;
