import "@/app/globals.css";
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
      className={`${inter.variable} ${instrumentSerif.variable} ${robotoMono.variable} theme-purple`}
      suppressHydrationWarning
    >
      <body>
        <Providers>
          <Header />
          <div className="flex flex-1 flex-col overflow-y-auto">
            <LayoutMountWrapper>{children}</LayoutMountWrapper>
          </div>
        </Providers>
      </body>
    </html>
  );
}
