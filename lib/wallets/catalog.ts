export type WalletClientEnvironment = "desktop" | "mobile";

export type WalletDefinition = {
  id: string;
  name: string;
  src: string;
  supportedEnvironments: readonly WalletClientEnvironment[];
};

export const walletDefinitions: readonly WalletDefinition[] = [
  {
    id: "keplr-extension",
    name: "Keplr",
    src: "/images/keplr-logo.png",
    // Includes "mobile" because Keplr's in-app browser injects window.keplr
    // as a desktop extension, but navigator.userAgent reports as mobile
    supportedEnvironments: ["desktop", "mobile"],
  },
  {
    id: "keplr-mobile",
    name: "Keplr Mobile",
    src: "/images/keplr-logo.png",
    supportedEnvironments: ["mobile", "desktop"],
  },
  {
    id: "cosmostation-extension",
    name: "Cosmostation",
    src: "/images/cosmostation-logo.png",
    supportedEnvironments: ["desktop"],
  },
  {
    id: "leap-extension",
    name: "Leap",
    src: "/images/leap-logo.png",
    // Includes "mobile" because Leap's in-app browser injects window.leap
    // as a desktop extension, but navigator.userAgent reports as mobile
    supportedEnvironments: ["desktop", "mobile"],
  },
  {
    id: "cosmostation-mobile",
    name: "Cosmostation",
    src: "/images/cosmostation-logo.png",
    supportedEnvironments: ["mobile"],
  },
  {
    id: "leap-cosmos-mobile",
    name: "Leap",
    src: "/images/leap-logo.png",
    supportedEnvironments: ["mobile"],
  },
  {
    id: "leap-metamask-cosmos-snap",
    name: "Metamask",
    src: "/images/metamask-logo.png",
    supportedEnvironments: ["desktop"],
  },
];

const MOBILE_USER_AGENT_PATTERN = /Android|iPhone|iPad|iPod/i;

export function getWalletClientEnvironment(
  userAgent?: string
): WalletClientEnvironment {
  return userAgent && MOBILE_USER_AGENT_PATTERN.test(userAgent)
    ? "mobile"
    : "desktop";
}

export function getCurrentWalletClientEnvironment(): WalletClientEnvironment {
  if (typeof navigator === "undefined") {
    return "desktop";
  }

  return getWalletClientEnvironment(navigator.userAgent);
}

export function getSupportedWalletDefinitions(
  environment: WalletClientEnvironment
): WalletDefinition[] {
  return walletDefinitions.filter((wallet) =>
    wallet.supportedEnvironments.includes(environment)
  );
}

export function getSupportedWalletIds(
  environment: WalletClientEnvironment
): string[] {
  return getSupportedWalletDefinitions(environment).map((wallet) => wallet.id);
}

export function filterWalletsByClientEnvironment<
  T extends { walletName: string },
>(wallets: T[], environment: WalletClientEnvironment): T[] {
  const supportedWalletIds = new Set(getSupportedWalletIds(environment));

  return wallets.filter((wallet) => supportedWalletIds.has(wallet.walletName));
}
