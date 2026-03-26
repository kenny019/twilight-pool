"use client";

import { useCallback, useMemo, useState } from "react";
import cn from "@/lib/cn";
import { categorizeWallets } from "@/lib/wallets/detect";
import { WalletEntry } from "@/lib/wallets/registry";
import { getWalletDeepLink } from "@/lib/wallets/deep-links";
import {
  isMobileBrowser,
  isAndroidBrowser,
  isIOSBrowser,
} from "@/lib/utils/is-mobile";
import {
  ConnectionState,
  isActiveView,
} from "@/lib/hooks/useWalletConnection";
import NextImage from "@/components/next-image";
import Button from "@/components/button";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  ExternalLink,
  Loader2,
  Smartphone,
  Link as LinkIcon,
} from "lucide-react";

interface WalletListProps {
  state: ConnectionState;
  onSelect: (wallet: WalletEntry) => void;
}

function SectionHeader({ label }: { label: string }) {
  return (
    <p className="px-1 pb-1 pt-3 text-[10px] font-medium uppercase tracking-wider text-primary-accent/50 first:pt-0">
      {label}
    </p>
  );
}

function WalletRow({
  wallet,
  isActive,
  isConnecting,
  disabled,
  onClick,
}: {
  wallet: WalletEntry;
  isActive: boolean;
  isConnecting: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={cn(
        "group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-all duration-150",
        isActive
          ? "bg-primary/[0.06] ring-1 ring-primary/20"
          : "hover:bg-primary/[0.04]",
        (isConnecting || disabled) && "pointer-events-none opacity-70"
      )}
      onClick={onClick}
      disabled={isConnecting || disabled}
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/[0.06]">
        <NextImage
          src={wallet.logo}
          alt={wallet.name}
          width={24}
          height={24}
          className="rounded-sm"
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-medium">{wallet.name}</span>
        {wallet.platform === "snap" && (
          <span className="text-[10px] text-primary-accent/50">
            Cosmos Snap
          </span>
        )}
      </div>

      {isActive && isConnecting ? (
        <Loader2 className="h-4 w-4 shrink-0 animate-spin text-theme" />
      ) : (
        <ChevronRight className="h-4 w-4 shrink-0 text-primary-accent/30 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-primary-accent/60" />
      )}
    </button>
  );
}

const CHAIN_SETUP_KEY = "keplr-wc-chain-setup";

function WalletConnectSetup({
  wallet,
  onDone,
  onBack,
}: {
  wallet: WalletEntry;
  onDone: () => void;
  onBack: () => void;
}) {
  const addChainUrl = useMemo(() => {
    if (typeof window === "undefined") return null;
    return getWalletDeepLink(wallet.id, window.location.origin + "/add-chain");
  }, [wallet.id]);

  const handleDone = useCallback(() => {
    try {
      localStorage.setItem(CHAIN_SETUP_KEY, "true");
    } catch {}
    onDone();
  }, [onDone]);

  return (
    <div className="flex flex-col gap-4 px-2 py-4">
      <p className="text-center text-sm font-semibold">
        Setup Keplr for WalletConnect
      </p>

      <div className="flex gap-3">
        <div className="flex flex-col items-center">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-theme text-xs font-bold text-white">
            1
          </div>
          <div className="mt-1 h-full w-px bg-primary/10" />
        </div>
        <div className="flex-1 pb-3">
          <p className="text-sm font-medium">Add Twilight Chain</p>
          <p className="mt-1 text-xs text-primary-accent/60">
            Open the link below to add the Twilight chain to your Keplr app.
          </p>
          {addChainUrl && (
            <Button asChild size="small" className="mt-2.5 gap-2 text-sm">
              <a href={addChainUrl}>
                <ExternalLink className="h-4 w-4" />
                Add Chain in Keplr
              </a>
            </Button>
          )}
        </div>
      </div>

      <div className="flex gap-3">
        <div className="flex flex-col items-center">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-theme text-xs font-bold text-white">
            2
          </div>
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium">Restart Keplr</p>
          <p className="mt-1 text-xs text-primary-accent/60">
            After adding the chain, close and reopen the Keplr app to load it
            properly.
          </p>
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <Button
          size="small"
          className="flex-1 gap-2 text-sm"
          onClick={handleDone}
        >
          <Check className="h-4 w-4" />
          Done, Connect
        </Button>
        <Button
          variant="ui"
          size="small"
          className="gap-2 text-sm"
          onClick={onBack}
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
      </div>
    </div>
  );
}

function MobileWalletCard({
  wallet,
  isActive,
  isConnecting,
  disabled,
  onSelect,
}: {
  wallet: WalletEntry;
  isActive: boolean;
  isConnecting: boolean;
  disabled?: boolean;
  onSelect: () => void;
}) {
  const [showSetup, setShowSetup] = useState(false);

  const showWalletConnect = useMemo(() => {
    if (isAndroidBrowser()) {
      return process.env.NEXT_PUBLIC_SHOW_WC_ANDROID === "true";
    }
    if (isIOSBrowser()) {
      return process.env.NEXT_PUBLIC_SHOW_WC_IOS === "true";
    }
    return true;
  }, []);

  const browserDeepLink = useMemo(() => {
    if (typeof window === "undefined") return null;
    return getWalletDeepLink(wallet.id, window.location.origin);
  }, [wallet.id]);

  const shortName = wallet.name.replace(" Mobile", "");

  const handleWalletConnect = useCallback(() => {
    try {
      if (localStorage.getItem(CHAIN_SETUP_KEY)) {
        onSelect();
        return;
      }
    } catch {}
    setShowSetup(true);
  }, [onSelect]);

  if (showSetup) {
    return (
      <WalletConnectSetup
        wallet={wallet}
        onDone={onSelect}
        onBack={() => setShowSetup(false)}
      />
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 px-2 py-4">
      <div className="rounded-2xl bg-primary/[0.06] p-3">
        <NextImage
          src={wallet.logo}
          alt={wallet.name}
          width={48}
          height={48}
          className="rounded-lg"
        />
      </div>
      <p className="text-sm font-medium">{shortName}</p>

      <div className="flex w-full flex-col gap-3">
        {browserDeepLink && (
          <Button
            asChild
            variant="ui"
            className="w-full gap-2 rounded-lg py-3 text-sm"
          >
            <a href={browserDeepLink}>
              <Smartphone className="h-4 w-4" />
              Open in {shortName} Browser
            </a>
          </Button>
        )}

        {wallet.supportsWalletConnect && showWalletConnect && (
          <Button
            variant="ui"
            className="w-full gap-2 rounded-lg py-3 text-sm"
            onClick={handleWalletConnect}
            disabled={isConnecting || disabled}
          >
            {isActive && isConnecting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <LinkIcon className="h-4 w-4" />
            )}
            Connect via WalletConnect
          </Button>
        )}
      </div>
    </div>
  );
}

export default function WalletList({ state, onSelect }: WalletListProps) {
  const categories = useMemo(() => categorizeWallets(), []);
  const isMobile = useMemo(() => isMobileBrowser(), []);

  const activeWalletId = state.view !== "idle" ? state.wallet.id : null;
  const isConnecting = isActiveView(state);

  const hasInstalled = categories.installed.length > 0;
  const hasMobile = categories.mobile.length > 0;
  const hasOther = categories.other.length > 0;

  return (
    <div className="flex flex-col gap-0.5 overflow-y-auto p-3">
      {hasInstalled && (
        <>
          {(hasMobile || hasOther) && <SectionHeader label="Installed" />}
          {categories.installed.map((w) => (
            <WalletRow
              key={w.id}
              wallet={w}
              isActive={activeWalletId === w.id}
              isConnecting={isConnecting && activeWalletId === w.id}
              disabled={isConnecting && activeWalletId !== w.id}
              onClick={() => onSelect(w)}
            />
          ))}
        </>
      )}

      {hasMobile && (
        <>
          {!isMobile && (hasInstalled || hasOther) && (
            <SectionHeader label="Mobile" />
          )}
          <div className={cn(isMobile && "flex flex-col gap-2")}>
            {categories.mobile.map((w) =>
              isMobile ? (
                <MobileWalletCard
                  key={w.id}
                  wallet={w}
                  isActive={activeWalletId === w.id}
                  isConnecting={isConnecting && activeWalletId === w.id}
                  disabled={isConnecting && activeWalletId !== w.id}
                  onSelect={() => onSelect(w)}
                />
              ) : (
                <WalletRow
                  key={w.id}
                  wallet={w}
                  isActive={activeWalletId === w.id}
                  isConnecting={isConnecting && activeWalletId === w.id}
                  onClick={() => onSelect(w)}
                />
              )
            )}
          </div>
        </>
      )}

      {hasOther && (
        <>
          {(hasInstalled || hasMobile) && <SectionHeader label="Other" />}
          {categories.other.map((w) => (
            <WalletRow
              key={w.id}
              wallet={w}
              isActive={activeWalletId === w.id}
              isConnecting={isConnecting && activeWalletId === w.id}
              disabled={isConnecting && activeWalletId !== w.id}
              onClick={() => onSelect(w)}
            />
          ))}
        </>
      )}

      {!hasInstalled && !hasMobile && !hasOther && (
        <p className="py-6 text-center text-sm text-primary-accent">
          No wallets available
        </p>
      )}
    </div>
  );
}
