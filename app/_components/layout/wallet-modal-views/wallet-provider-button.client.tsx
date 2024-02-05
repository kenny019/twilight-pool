"use client";
import NextImage from "@/components/next-image";
import cn from "@/lib/cn";
import { useTwilight } from "@/lib/providers/twilight";
import { useChainWallet } from "@cosmos-kit/react-lite";
import React from "react";
import { useRouter } from "next/navigation";
import { useWalletDialog } from "../connect-wallet.client";
import { useToast } from "@/lib/hooks/useToast";

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
        description: `Please install ${wallet.name} before connecting!`,
        variant: "error",
      });
    }

    await chainWallet.connect(true);

    const depositAddress = chainWallet.address || "";

    if (!depositAddress) {
      return toast({
        title: "Error getting wallet address",
        description: "Please allow this website to connect to your wallet",
        variant: "error",
      });
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
