"use client";

import { useEffect, useMemo, useState } from "react";
import { ConnectionState } from "@/lib/hooks/useWalletConnection";
import { getErrorMessage } from "@/lib/wallets/errors";
import { getWalletDeepLink } from "@/lib/wallets/deep-links";
import { isMobileBrowser } from "@/lib/utils/is-mobile";
import NextImage from "@/components/next-image";
import Button from "@/components/button";
import {
  AlertCircle,
  Chrome,
  Loader2,
  RefreshCw,
  Shield,
  Smartphone,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import WalletQRCode from "./wallet-qr-code.client";
import { WalletEntry } from "@/lib/wallets/registry";

function AppleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
    </svg>
  );
}

function PlayStoreIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M3.61 1.814L13.793 12 3.61 22.186a.996.996 0 01-.61-.92V2.734a1 1 0 01.61-.92zm.653-.463L15.11 6.95l-2.852 2.852L4.263 1.35zM20.11 10.95L17.6 9.51l-3.14 3.14 3.14 3.14 2.51-1.44a1.246 1.246 0 000-2.4zm-5.36 3.49l-2.852 2.853L4.263 22.65l7.735-7.735 2.752-2.475z" />
    </svg>
  );
}

function DownloadButtons({
  wallet,
  onReset,
}: {
  wallet: WalletEntry;
  onReset: () => void;
}) {
  const links = wallet.downloadLinks;

  if (!links || links.length === 0) {
    return (
      <div className="flex gap-2">
        {wallet.downloadUrl && (
          <Button asChild size="small" className="text-xs">
            <Link href={wallet.downloadUrl} target="_blank">
              Install {wallet.name}
            </Link>
          </Button>
        )}
        <Button variant="ui" size="small" onClick={onReset} className="text-xs">
          Go back
        </Button>
      </div>
    );
  }

  const mobileLinks = links.filter(
    (l) => l.browser === "ios" || l.browser === "android"
  );
  const desktopLinks = links.filter(
    (l) => l.browser !== "ios" && l.browser !== "android"
  );

  const browserIcon = (browser: string) => {
    switch (browser) {
      case "chrome":
        return <Chrome className="h-3.5 w-3.5" />;
      case "brave":
        return <Shield className="h-3.5 w-3.5" />;
      case "ios":
        return <AppleIcon className="h-3.5 w-3.5" />;
      case "android":
        return <PlayStoreIcon className="h-3.5 w-3.5" />;
      default:
        return <Smartphone className="h-3.5 w-3.5" />;
    }
  };

  const browserLabel = (browser: string) => {
    switch (browser) {
      case "chrome":
        return "Chrome";
      case "brave":
        return "Brave";
      case "ios":
        return "App Store";
      case "android":
        return "Google Play";
      default:
        return browser;
    }
  };

  // Show app store links for mobile wallets, browser links for extensions
  const linksToShow = wallet.platform === "mobile" ? mobileLinks : desktopLinks;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        {linksToShow.map((link) => (
          <Button
            key={link.browser}
            asChild
            size="small"
            className="gap-1.5 text-xs"
          >
            <Link href={link.url} target="_blank">
              {browserIcon(link.browser)}
              {browserLabel(link.browser)}
            </Link>
          </Button>
        ))}
      </div>
      <Button variant="ui" size="small" onClick={onReset} className="text-xs">
        Go back
      </Button>
    </div>
  );
}

function OpenInAppLink({
  wallet,
  label,
  hint,
}: {
  wallet: WalletEntry;
  label?: string;
  hint?: string;
}) {
  const deepLinkUrl = useMemo(() => {
    if (typeof window === "undefined" || wallet.platform !== "mobile")
      return null;
    return getWalletDeepLink(wallet.id, window.location.origin + "/add-chain");
  }, [wallet.id, wallet.platform]);

  if (!deepLinkUrl) return null;

  return (
    <div className="mt-2">
      {hint && (
        <p className="mb-1 text-[10px] text-primary-accent/50">{hint}</p>
      )}
      <Button asChild variant="ui" size="small" className="gap-1.5 text-xs">
        <a href={deepLinkUrl}>
          <Smartphone className="h-3.5 w-3.5" />
          {label ?? `Open in ${wallet.name}`}
        </a>
      </Button>
    </div>
  );
}

interface WalletStatePaneProps {
  state: ConnectionState;
  onRetry: () => void;
  onReset: () => void;
}

export default function WalletStatePane({
  state,
  onRetry,
  onReset,
}: WalletStatePaneProps) {
  // "Taking too long?" hint after 5s in connecting state
  const [showSlowHint, setShowSlowHint] = useState(false);

  useEffect(() => {
    if (state.view !== "connecting") {
      setShowSlowHint(false);
      return;
    }

    const timer = setTimeout(() => setShowSlowHint(true), 5_000);
    return () => clearTimeout(timer);
  }, [state.view]);

  // ── Idle ──
  if (state.view === "idle") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <div className="rounded-xl bg-primary/[0.06] p-4">
          <Wallet className="h-8 w-8 text-primary/40" />
        </div>
        <p className="text-sm text-primary-accent">
          Select a wallet to get started
        </p>
      </div>
    );
  }

  // ── Suggesting chain (first-time extension users) ──
  if (state.view === "suggesting_chain") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="relative">
          <div className="rounded-2xl bg-primary/[0.06] p-3">
            <NextImage
              src={state.wallet.logo}
              alt={state.wallet.name}
              width={48}
              height={48}
              className="rounded-lg"
            />
          </div>
          <Loader2 className="absolute -bottom-1 -right-1 h-5 w-5 animate-spin text-theme" />
        </div>
        <div>
          <p className="text-sm font-medium">
            Add Chain in {state.wallet.name}
          </p>
          <p className="mt-1 text-xs text-primary-accent">
            Approve the Nyks chain in {state.wallet.name} to continue
          </p>
        </div>
      </div>
    );
  }

  // ── Connecting (extension/snap) ──
  if (state.view === "connecting") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="relative">
          <div className="rounded-2xl bg-primary/[0.06] p-3">
            <NextImage
              src={state.wallet.logo}
              alt={state.wallet.name}
              width={48}
              height={48}
              className="rounded-lg"
            />
          </div>
          <Loader2 className="absolute -bottom-1 -right-1 h-5 w-5 animate-spin text-theme" />
        </div>
        <div>
          <p className="text-sm font-medium">Requesting Connection</p>
          <p className="mt-1 text-xs text-primary-accent">
            Approve the connection request in {state.wallet.name}{" "}
            {state.wallet.platform === "snap" ? "snap" : "extension"}
          </p>
        </div>
        {showSlowHint && (
          <button
            type="button"
            onClick={onReset}
            className="text-xs text-primary-accent/60 underline transition-colors hover:text-primary-accent"
          >
            Taking too long? Go back
          </button>
        )}
      </div>
    );
  }

  // ── QR code (mobile wallets) ──
  if (state.view === "qr") {
    const isMobile = isMobileBrowser();

    // Mobile: no QR (can't scan own screen), show waiting state
    // with a reconnect button for when user returns from the wallet app
    if (isMobile) {
      return (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
          <div className="relative">
            <div className="rounded-2xl bg-primary/[0.06] p-3">
              <NextImage
                src={state.wallet.logo}
                alt={state.wallet.name}
                width={48}
                height={48}
                className="rounded-lg"
              />
            </div>
            <Loader2 className="absolute -bottom-1 -right-1 h-5 w-5 animate-spin text-theme" />
          </div>
          <div>
            <p className="text-sm font-medium">
              Approve in {state.wallet.name}
            </p>
            <p className="mt-1 text-xs text-primary-accent">
              Open the {state.wallet.name} app and approve the connection
            </p>
          </div>
          <Button size="small" className="gap-2 text-xs" onClick={onRetry}>
            <RefreshCw className="h-3.5 w-3.5" />
            Approved? Tap to connect
          </Button>
          <button
            type="button"
            onClick={onReset}
            className="text-xs text-primary-accent/60 underline transition-colors hover:text-primary-accent"
          >
            Go back
          </button>
        </div>
      );
    }

    // Desktop: show QR code
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
        <WalletQRCode uri={state.qrUri} logoSrc={state.wallet.logo} />
        <div>
          <p className="text-sm font-medium">Scan with {state.wallet.name}</p>
          <p className="mt-1 text-xs text-primary-accent">
            Open {state.wallet.name} and scan the QR code to connect
          </p>
        </div>
        <OpenInAppLink wallet={state.wallet} hint="QR not working?" />
      </div>
    );
  }

  // ── Not installed ──
  if (state.view === "not_installed") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="rounded-2xl bg-primary/[0.06] p-3">
          <NextImage
            src={state.wallet.logo}
            alt={state.wallet.name}
            width={48}
            height={48}
            className="rounded-lg"
          />
        </div>
        <div>
          <p className="text-sm font-medium">{state.wallet.name} not found</p>
          <p className="mt-1 text-xs text-primary-accent">
            {state.wallet.platform === "mobile"
              ? `Install the ${state.wallet.name} app to continue`
              : `Install the ${state.wallet.name} extension to continue`}
          </p>
        </div>
        <DownloadButtons wallet={state.wallet} onReset={onReset} />
        <OpenInAppLink wallet={state.wallet} hint="Already installed?" />
      </div>
    );
  }

  // ── Error ──
  if (state.view === "error") {
    const { title, description } = getErrorMessage(
      state.errorType,
      state.wallet.name
    );

    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="rounded-xl bg-red/10 p-3">
          <AlertCircle className="h-7 w-7 text-red" />
        </div>
        <div>
          <p className="text-sm font-medium">{title}</p>
          <p className="mt-1 text-xs text-primary-accent">{description}</p>
        </div>
        <div className="flex flex-col items-center gap-2">
          <div className="flex gap-2">
            <Button size="small" onClick={onRetry} className="text-xs">
              Try Again
            </Button>
            <Button
              variant="ui"
              size="small"
              onClick={onReset}
              className="text-xs"
            >
              Go back
            </Button>
          </div>
          <OpenInAppLink wallet={state.wallet} label="Open in App" />
        </div>
      </div>
    );
  }

  return null;
}
