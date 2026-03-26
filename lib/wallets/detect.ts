import { isMobileBrowser } from "@/lib/utils/is-mobile";
import { WALLET_REGISTRY, WalletEntry } from "./registry";

export type WalletCategory = "installed" | "mobile" | "other";

export type CategorizedWallets = Record<WalletCategory, WalletEntry[]>;

/**
 * Check if a browser extension is installed by looking for its window property.
 */
export function isExtensionInstalled(windowKey: string): boolean {
  if (typeof window === "undefined") return false;
  // eslint-disable-next-line no-prototype-builtins
  return (
    windowKey in window &&
    !!(window as unknown as Record<string, unknown>)[windowKey]
  );
}

/**
 * Detect if running inside a wallet's in-app mobile browser.
 * Returns the matching wallet entry for auto-connect, or null.
 */
export function detectInAppBrowser(): WalletEntry | null {
  if (typeof window === "undefined") return null;

  const w = window as unknown as Record<
    string,
    Record<string, unknown> | undefined
  >;

  // Check Leap before Keplr — Leap's in-app browser also injects window.keplr
  if ((w.leap as Record<string, unknown> | undefined)?.mode === "mobile-web") {
    return WALLET_REGISTRY.find((e) => e.id === "leap-extension") ?? null;
  }

  if ((w.keplr as Record<string, unknown> | undefined)?.mode === "mobile-web") {
    return WALLET_REGISTRY.find((e) => e.id === "keplr-extension") ?? null;
  }

  return null;
}

export interface WalletProvider {
  experimentalSuggestChain: (chainInfo: unknown) => Promise<void>;
  enable: (chainId: string) => Promise<void>;
  getKey: (chainId: string) => Promise<unknown>;
}

export interface RawWalletObject {
  mode?: string;
  experimentalSuggestChain?: (chainInfo: unknown) => Promise<void>;
  enable?: (chainId: string) => Promise<void>;
  getKey?: (chainId: string) => Promise<unknown>;
}

function isValidProvider(
  obj: RawWalletObject
): obj is WalletProvider & { mode?: string } {
  return (
    typeof obj.experimentalSuggestChain === "function" &&
    typeof obj.enable === "function" &&
    typeof obj.getKey === "function"
  );
}

/**
 * Get the actual wallet provider object when running inside a wallet's in-app browser.
 * Returns the provider for calling experimentalSuggestChain, enable, getKey, etc.
 */
export function getInAppWalletProvider(): {
  name: string;
  provider: WalletProvider;
} | null {
  if (typeof window === "undefined") return null;

  const w = window as unknown as Record<string, unknown>;

  // Check Leap before Keplr — Leap's in-app browser also injects window.keplr
  const leap = w.leap as RawWalletObject | undefined;
  if (leap?.mode === "mobile-web" && isValidProvider(leap)) {
    return { name: "Leap", provider: leap };
  }

  const keplr = w.keplr as RawWalletObject | undefined;
  if (keplr?.mode === "mobile-web" && isValidProvider(keplr)) {
    return { name: "Keplr", provider: keplr };
  }

  return null;
}

/**
 * Categorize wallets based on platform and installation status.
 *
 * Desktop: extensions split into installed/other, snap in "other", mobile hidden.
 * Mobile regular browser: only mobile wallets shown.
 * Mobile in-app browser: returns only the detected wallet as "installed".
 */
export function categorizeWallets(): CategorizedWallets {
  const isMobile = isMobileBrowser();
  const inAppWallet = isMobile ? detectInAppBrowser() : null;

  if (inAppWallet) {
    return {
      installed: [inAppWallet],
      mobile: [],
      other: [],
    };
  }

  if (isMobile) {
    return {
      installed: [],
      mobile: WALLET_REGISTRY.filter((w) => w.platform === "mobile"),
      other: [],
    };
  }

  const showKeplrMobileDesktop =
    process.env.NEXT_PUBLIC_SHOW_KEPLR_MOBILE_DESKTOP === "true";

  const installed: WalletEntry[] = [];
  const mobile: WalletEntry[] = [];
  const other: WalletEntry[] = [];

  for (const wallet of WALLET_REGISTRY) {
    if (wallet.platform === "mobile") {
      if (showKeplrMobileDesktop) {
        mobile.push(wallet);
      }
      continue;
    }

    if (wallet.platform === "snap") {
      other.push(wallet);
      continue;
    }

    if (wallet.windowKey && isExtensionInstalled(wallet.windowKey)) {
      installed.push(wallet);
    } else {
      other.push(wallet);
    }
  }

  return { installed, mobile, other };
}
