import { isAndroidBrowser } from "@/lib/utils/is-mobile";

interface DeepLinkBuilder {
  ios: (url: string) => string;
  android: (url: string) => string;
}

const DEEP_LINK_MAP: Record<string, DeepLinkBuilder> = {
  "keplr-mobile": {
    ios: (url) => `keplrwallet://web-browser?url=${encodeURIComponent(url)}`,
    android: (url) =>
      `intent://web-browser?url=${encodeURIComponent(url)}#Intent;package=com.chainapsis.keplr;scheme=keplrwallet;end;`,
  },
};

/**
 * Get a deep link URL that opens `targetUrl` inside the wallet's in-app browser.
 * Returns null for wallet IDs that don't support deep linking.
 */
export function getWalletDeepLink(
  walletId: string,
  targetUrl: string
): string | null {
  const builder = DEEP_LINK_MAP[walletId];
  if (!builder) return null;
  return isAndroidBrowser()
    ? builder.android(targetUrl)
    : builder.ios(targetUrl);
}
