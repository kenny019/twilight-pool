import "@/app/globals.css";
import React from "react";
import ComponentsSidebar from "./design/sidebar.client";

import type { Metadata } from "next";
import { Providers } from "../providers";
import { instrumentSerif, inter, robotoMono } from "@/lib/fonts";
import { baseMetadata } from "@/lib/metadata";

export const metadata = baseMetadata;
export default function ComponentsLayout({
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
          <div className="flex h-screen overflow-hidden">
            {/* sidebar */}
            <ComponentsSidebar />
            <div className="flex w-0 flex-1 flex-col overflow-y-auto">
              <main className="mx-auto flex w-full max-w-7xl px-4 py-8 sm:px-6 md:px-8">
                {children}
              </main>
            </div>
          </div>
        </Providers>
      </body>
    </html>
  );
}
