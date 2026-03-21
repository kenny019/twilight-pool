"use client";
import NextImage from "@/components/next-image";
import cn from "@/lib/cn";
import { useTwilight } from "@/lib/providers/twilight";
import { useChainWallet } from "@cosmos-kit/react-lite";
import React from "react";
import { useRouter } from "next/navigation";
import { useWalletDialog } from "../connect-wallet.client";
import { useToast } from "@/lib/hooks/useToast";

declare global {
  interface Window {
    okxwallet?: unknown;
  }
}

type Wallet = {
  id: string;
  name: string;
  src: string;
};

type Props = {
  wallet: Wallet;
  className?: string;
};

const WalletProviderButton = ({ wallet, className }: Props) => {
  const { chainWallet } = useChainWallet("nyks", wallet.id);

  const router = useRouter();
  const { hasInit, setHasInit } = useTwilight();
  const { setOpen } = useWalletDialog();

  const { toast } = useToast();

  const isMobileWallet = wallet.id === "keplr-mobile";

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

    if (wallet.name === "Metamask" && typeof window !== "undefined" && window.okxwallet) {
      toast({
        title: "OKX wallet is currently not supported",
        description: `Please disable the OKX wallet extension before connecting, currently only the Leap Metamask Cosmos Snap is supported.`,
        variant: "error",
      });
      return;
    }

    await chainWallet.connect(true);

    const depositAddress = chainWallet.address || "";

    if (!depositAddress) {
      if (isMobileWallet) {
        toast({
          title: "Connection failed",
          description: "Could not connect to Keplr Mobile. Please try again.",
          variant: "error",
        });
        return;
      }

      if (wallet.name === "Metamask") {
        toast({
          title: "Metamask Cosmos Snap is not installed",
          description: `Please install the Leap Metamask Cosmos Snap before connecting, currently there is a known conflict with the OKX wallet extension`,
          variant: "error",
        });

        return;
      }

      toast({
        title: "Error getting wallet",
        description: `Please install ${wallet.name} before connecting!`,
        variant: "error",
      });
      return
    }

    // const { success } = await getBTCDepositAddress(depositAddress);

    setOpen(false);

    // if (!success) {
    //   router.push("/registration");
    // }
  }

  return (
    <div className={cn("flex cursor-pointer flex-col border p-1", className)}>
      <button
        className="flex h-full flex-col items-center justify-center rounded-lg py-2 transition-colors duration-300 hover:bg-primary hover:text-background"
        onClick={connectWallet}
      >
        <NextImage
          alt={`${wallet.name} logo`}
          src={wallet.src}
          width={48}
          height={48}
        />
        <p className="select-none text-2xl font-semibold">{wallet.name}</p>
      </button>
    </div>
  );
};

export default WalletProviderButton;
