"use client";
import NextImage from "@/components/next-image";
import { useTwilight } from "@/lib/providers/twilight";
import { useChainWallet } from "@cosmos-kit/react-lite";
import React, { useState } from "react";
import { useWalletDialog } from "../connect-wallet.client";
import { useToast } from "@/lib/hooks/useToast";
import { ChevronRight, Loader2 } from "lucide-react";

type Wallet = {
  id: string;
  name: string;
  src: string;
};

type Props = {
  wallet: Wallet;
  className?: string;
};

const WalletProviderButton = ({ wallet }: Props) => {
  const { chainWallet } = useChainWallet("nyks", wallet.id);
  const { hasInit, setHasInit } = useTwilight();
  const { setOpen } = useWalletDialog();
  const { toast } = useToast();
  const [isConnecting, setIsConnecting] = useState(false);

  const isMobileWallet = wallet.id.endsWith("-mobile");

  async function connectWallet(
    e: React.MouseEvent<HTMLButtonElement, MouseEvent>
  ) {
    e.preventDefault();

    if (!hasInit) {
      setHasInit("true");
    }

    if (!chainWallet) {
      return toast({
        title: "Error getting wallet",
        description: isMobileWallet
          ? "Could not initialize Keplr Mobile connection."
          : `Please install ${wallet.name} before connecting!`,
        variant: "error",
      });
    }

    setIsConnecting(true);
    try {
      await chainWallet.connect(true);

      if (!chainWallet.address) {
        toast({
          title: `${wallet.name} not found`,
          description: `Please install the ${wallet.name} extension and try again.`,
          variant: "error",
        });
        return;
      }
    } catch (err) {
      console.error(`Failed to connect ${wallet.name}:`, err);
      toast({
        title: "Connection failed",
        description: `Could not connect to ${wallet.name}. Please try again.`,
        variant: "error",
      });
      return;
    } finally {
      setIsConnecting(false);
    }

    setOpen(false);
  }

  return (
    <button
      className="group flex w-full items-center gap-3 rounded-lg border border-outline/50 px-3 py-2.5 transition-all duration-200 hover:border-primary/30 hover:bg-primary/[0.04] active:scale-[0.99] disabled:pointer-events-none disabled:opacity-50"
      onClick={connectWallet}
      disabled={isConnecting}
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/[0.06]">
        <NextImage
          alt={`${wallet.name} logo`}
          src={wallet.src}
          width={24}
          height={24}
          className="rounded-sm"
        />
      </div>

      <span className="flex-1 text-left text-sm font-medium">{wallet.name}</span>

      {isConnecting ? (
        <Loader2 className="h-4 w-4 animate-spin text-primary-accent" />
      ) : (
        <ChevronRight className="h-4 w-4 text-primary-accent/40 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-primary-accent" />
      )}
    </button>
  );
};

export default WalletProviderButton;
