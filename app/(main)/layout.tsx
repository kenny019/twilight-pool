import "@/app/globals.css";
import type { Metadata } from "next";
import { Providers } from "../providers";
import { instrumentSerif, inter, robotoMono } from "@/lib/fonts";
import Header from "../_components/layout/header";
import { baseMetadata } from "@/lib/metadata";
import LayoutMountWrapper from "../_components/layout/layout-mount.client";

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
          <Header />
          <div className="mb-20 flex flex-1 flex-col overflow-y-auto">
            <div className="mx-auto flex w-full max-w-7xl px-4">
              <LayoutMountWrapper>{children}</LayoutMountWrapper>
            </div>
          </div>
        </Providers>
      </body>
    </html>
  );
}
