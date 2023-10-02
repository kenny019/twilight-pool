import { Instrument_Serif, Inter, Roboto_Mono } from "next/font/google";

export const inter = Inter({ subsets: ["latin"], variable: "--font-body" });
export const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  variable: "--font-feature",
  weight: "400",
});
export const robotoMono = Roboto_Mono({
  subsets: ["latin"],
  variable: "--font-ui",
});
