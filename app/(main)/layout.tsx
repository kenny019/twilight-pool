import "@/app/globals.css";
import { Providers } from "../providers";
import { instrumentSerif, inter, robotoMono } from "@/lib/fonts";
import Header from "../_components/layout/header";
import { baseMetadata } from "@/lib/metadata";
import LayoutMountWrapper from "../_components/layout/layout-mount.client";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

export const metadata = baseMetadata;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${instrumentSerif.variable} ${robotoMono.variable}`}
      suppressHydrationWarning
    >
      <body>
        <Providers>
          <>
            <div className="block bg-purple p-2 text-center">
              <span>Participate in Open Testnet 1 by </span>
              <Link
                className="inline-flex whitespace-nowrap underline"
                href={
                  "https://github.com/twilight-project/testnets/blob/main/open-testnet-1/dockerize/readme.md"
                }
                target="_blank"
              >
                running a node <ArrowUpRight className="h-3 w-3" />
              </Link>
              <span>, or </span>
              <Link
                className="inline-flex whitespace-nowrap underline"
                href={"/btc-deposit-flow"}
                target="_blank"
              >
                depositing and withdrawing BTC{" "}
                <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
            <Header />
            <div className="flex flex-1 flex-col">
              <LayoutMountWrapper>{children}</LayoutMountWrapper>
            </div>
          </>
        </Providers>
      </body>
    </html>
  );
}
