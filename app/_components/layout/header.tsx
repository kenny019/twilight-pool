"use client";

import Logo from "@/components/logo";
import { Separator } from "@/components/seperator";
import Link from "next/link";
import React from "react";
import { ArrowUpRight } from "lucide-react";
import ConnectWallet from "./connect-wallet.client";
import Settings from "./settings.client";
import SubaccountSelect from "./subaccount/subaccount-select.client";
import MobileNav from "./mobile-navigation.client";
import KycStatus from "./kyc-status";
import { usePathname } from 'next/navigation';
import cn from '@/lib/cn';
import { TWILIGHT_NETWORK_TYPE } from '@/lib/constants';
import MultiLink from './multi-link.client';

const marketSubLinks = [
  {
    href: "/",
    title: "Trade"
  },
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
    title: "Deposit",
  },
  {
    href: "/withdrawal",
    title: "Withdraw",
  },
] as const;

const UserGuideLinks = [
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
  const pathname = usePathname();

  return (
    <nav className="border-b">
      <div className="mx-auto px-1 py-2 md:px-4 md:py-4">
        <div className="relative hidden items-center justify-between md:flex">
          <div className="flex items-center space-x-2 md:space-x-4">
            <Link className="hidden sm:block" href="/">
              <Logo className="hover:opacity-80" />
            </Link>
            <div className="hidden items-center lg:flex">
              <div className="flex items-center space-x-4">
                {
                  marketSubLinks.map((link) => (
                    <Link
                      className={cn("flex dark:text-gray-400 dark:hover:text-primary", pathname === link.href && "text-primary dark:text-primary underline")}
                      href={link.href} key={link.href}>
                      {link.title}
                    </Link>
                  ))
                }

                {
                  TWILIGHT_NETWORK_TYPE === "testnet" ? (
                    <Link
                      href="/faucet"
                      className="flex dark:text-gray-400 dark:hover:text-primary"
                    >
                      Faucet
                    </Link>
                  )
                    :
                    (
                      <MultiLink
                        title="Deposit/Withdraw BTC"
                        subLinks={btcSubLinks}
                      />
                    )

                }
              </div>
              <Separator className="mx-4 h-5" orientation="vertical" />
              <div className="flex items-center space-x-4">
                {/* <MultiLink
                  className={"min-w-[200px] justify-between"}
                  target={"_blank"}
                  title="User Guides"
                  subLinks={UserGuideLinks}
                /> */}
                <Link
                  href="https://user-guide.docs.twilight.rest/docs"
                  className="flex dark:text-gray-400 dark:hover:text-primary"
                  target="_blank"
                >
                  User Guides <ArrowUpRight className="h-4 w-4" />
                </Link>
                <Link
                  href="https://docs.twilight.org/"
                  className="flex dark:text-gray-400 dark:hover:text-primary"
                  target="_blank"
                >
                  Specs <ArrowUpRight className="h-4 w-4" />
                </Link>
                <Link
                  href="https://docs.twilight.rest/#introduction"
                  className="flex dark:text-gray-400 dark:hover:text-primary"
                  target="_blank"
                >
                  Developer Docs<ArrowUpRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>

          {/* right side */}
          <div className="mx-auto flex flex-row items-center space-x-2 sm:mx-0 md:space-x-4">
            {/* <KycStatus /> */}
            {/* <SubaccountSelect /> */}
            <ConnectWallet />
            <Settings />
          </div>
        </div>
        <div className="relative flex items-center justify-between px-2 md:hidden">
          <Link href="/">
            <Logo className="w-6" />
          </Link>
          <div className="flex items-center space-x-2">
            {/* <KycStatus /> */}
            <ConnectWallet />
            <MobileNav />
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Header;
