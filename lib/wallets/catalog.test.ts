import { describe, expect, it } from "vitest";
import {
  filterWalletsByClientEnvironment,
  getSupportedWalletDefinitions,
  getSupportedWalletIds,
  getWalletClientEnvironment,
} from "./catalog";

type MockWallet = { walletName: string; marker: string };

// Must match walletDefinitions order in catalog.ts so alignment tests compare like-for-like.
const mockWallets: MockWallet[] = [
  { walletName: "keplr-extension", marker: "desktop-keplr" },
  { walletName: "keplr-mobile", marker: "mobile-keplr" },
  { walletName: "cosmostation-extension", marker: "desktop-cosmostation" },
  { walletName: "leap-extension", marker: "desktop-leap" },
  { walletName: "cosmostation-mobile", marker: "mobile-cosmostation" },
  { walletName: "leap-cosmos-mobile", marker: "mobile-leap" },
  { walletName: "leap-metamask-cosmos-snap", marker: "desktop-metamask" },
];

describe("getWalletClientEnvironment", () => {
  it("detects desktop browsers", () => {
    const userAgent =
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/146.0.0.0 Safari/537.36";

    expect(getWalletClientEnvironment(userAgent)).toBe("desktop");
  });

  it("detects iPhone browsers as mobile", () => {
    const userAgent =
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_4 like Mac OS X) AppleWebKit/605.1.15 Version/18.4 Mobile/15E148 Safari/604.1";

    expect(getWalletClientEnvironment(userAgent)).toBe("mobile");
  });

  it("detects Android browsers as mobile", () => {
    const userAgent =
      "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 Chrome/146.0.0.0 Mobile Safari/537.36";

    expect(getWalletClientEnvironment(userAgent)).toBe("mobile");
  });
});

describe("wallet capability filtering", () => {
  it("returns matching wallet ids for desktop", () => {
    expect(getSupportedWalletIds("desktop")).toEqual([
      "keplr-extension",
      "keplr-mobile",
      "cosmostation-extension",
      "leap-extension",
      "leap-metamask-cosmos-snap",
    ]);
  });

  it("returns matching wallet ids for mobile", () => {
    // Extensions appear here because their in-app browsers inject window.keplr / window.leap
    // while navigator.userAgent reports mobile — see walletDefinitions comments.
    expect(getSupportedWalletIds("mobile")).toEqual([
      "keplr-extension",
      "keplr-mobile",
      "leap-extension",
      "cosmostation-mobile",
      "leap-cosmos-mobile",
    ]);
  });

  it("keeps provider wallet ids aligned with modal wallet ids on desktop", () => {
    const modalWalletIds = getSupportedWalletDefinitions("desktop").map(
      (wallet) => wallet.id
    );
    const providerWalletIds = filterWalletsByClientEnvironment(
      mockWallets,
      "desktop"
    ).map((wallet) => wallet.walletName);

    expect(providerWalletIds).toEqual(modalWalletIds);
  });

  it("keeps provider wallet ids aligned with modal wallet ids on mobile", () => {
    const modalWalletIds = getSupportedWalletDefinitions("mobile").map(
      (wallet) => wallet.id
    );
    const providerWalletIds = filterWalletsByClientEnvironment(
      mockWallets,
      "mobile"
    ).map((wallet) => wallet.walletName);

    expect(providerWalletIds).toEqual(modalWalletIds);
  });
});
