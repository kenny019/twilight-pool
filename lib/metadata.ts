import { Metadata } from "next";

export const baseMetadata: Metadata = {
  title: {
    default: "Twilight Finance",
    template: "%s | Twilight",
  },
  description: `Twilight is a layer 2 protocol for building private financial applications, 
    where the validity of computation is proven on-chain in zero-knowledge using Bulletproofs. 
    No trusted setup.`,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FFFFFF" },
    { media: "(prefers-color-scheme: dark)", color: "#08081C" },
  ],
  icons: [
    {
      rel: "icon",
      type: "image/svg+xml",
      url: "/favicon/favicon.svg",
    },
    {
      rel: "icon",
      type: "image/x-icon",
      sizes: "48x48",
      url: "/favicon/favicon.ico",
    },
    {
      rel: "icon",
      type: "image/png",
      sizes: "16x16",
      url: "/favicon/favicon-16.png",
    },
    {
      rel: "icon",
      type: "image/png",
      sizes: "32x32",
      url: "/favicon/favicon-32.png",
    },
    {
      rel: "icon",
      type: "image/png",
      sizes: "192x192",
      url: "/favicon/favicon-192.png",
    },
    {
      rel: "icon",
      type: "image/png",
      sizes: "512x512",
      url: "/favicon/favicon-512.png",
    },
    {
      rel: "apple-touch-icon",
      sizes: "180x180",
      url: "/favicon/apple-touch-icon.png",
    },
  ],
};
