export type WalletPlatform = "extension" | "mobile" | "snap";

export interface DownloadLink {
  browser: "chrome" | "brave" | "firefox" | "ios" | "android";
  url: string;
}

export interface WalletEntry {
  id: string;
  name: string;
  logo: string;
  platform: WalletPlatform;
  downloadUrl?: string;
  downloadLinks?: DownloadLink[];
  windowKey?: string;
  supportsWalletConnect?: boolean;
}

export const WALLET_REGISTRY: WalletEntry[] = [
  {
    id: "keplr-extension",
    name: "Keplr",
    logo: "/images/keplr-logo.png",
    platform: "extension",
    downloadUrl: "https://www.keplr.app/download",
    downloadLinks: [
      {
        browser: "chrome",
        url: "https://chromewebstore.google.com/detail/keplr/dmkamcknogkgcdfhhbddcghachkejeap",
      },
      {
        browser: "brave",
        url: "https://chromewebstore.google.com/detail/keplr/dmkamcknogkgcdfhhbddcghachkejeap",
      },
    ],
    windowKey: "keplr",
  },
  {
    id: "leap-extension",
    name: "Leap",
    logo: "/images/leap-logo.png",
    platform: "extension",
    downloadUrl: "https://www.leapwallet.io/download",
    downloadLinks: [
      {
        browser: "chrome",
        url: "https://chromewebstore.google.com/detail/leap-cosmos-wallet/fcfcfllfndlomdhbehjjcoimbgofdnof",
      },
      {
        browser: "brave",
        url: "https://chromewebstore.google.com/detail/leap-cosmos-wallet/fcfcfllfndlomdhbehjjcoimbgofdnof",
      },
    ],
    windowKey: "leap",
  },
  {
    id: "leap-metamask-cosmos-snap",
    name: "MetaMask",
    logo: "/images/metamask-logo.png",
    platform: "snap",
    downloadUrl:
      "https://snaps.metamask.io/snap/npm/leapwallet/metamask-cosmos-snap/",
    downloadLinks: [
      {
        browser: "chrome",
        url: "https://chromewebstore.google.com/detail/metamask/nkbihfbeogaeaoehlefnkodbefgpgknn",
      },
      {
        browser: "brave",
        url: "https://chromewebstore.google.com/detail/metamask/nkbihfbeogaeaoehlefnkodbefgpgknn",
      },
    ],
    windowKey: "ethereum",
  },
  {
    id: "keplr-mobile",
    name: "Keplr Mobile",
    logo: "/images/keplr-logo.png",
    platform: "mobile",
    supportsWalletConnect: true,
    downloadLinks: [
      {
        browser: "ios",
        url: "https://apps.apple.com/app/keplr-wallet/id1567851089",
      },
      {
        browser: "android",
        url: "https://play.google.com/store/apps/details?id=com.chainapsis.keplr",
      },
    ],
  },
];
