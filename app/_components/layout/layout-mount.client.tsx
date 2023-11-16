"use client";
import { getBTCDepositAddress } from "@/lib/rest";
import { useWallet } from "@cosmos-kit/react-lite";
import { usePathname } from "next/navigation";
import React, { useEffect } from "react";

const toDisplayRoutes = ["/registration", "/verification"];

const LayoutMountWrapper = ({ children }: { children: React.ReactNode }) => {
  const path = usePathname();

  const { mainWallet, status } = useWallet();

  useEffect(() => {
    async function autoConnect() {
      if (status !== "Connected" || !mainWallet) return;
      const chainWallet = mainWallet.getChainWallet("nyks");
      const address = chainWallet?.address || "";

      if (!toDisplayRoutes.includes(path) || !address) return;
    }

    autoConnect();
  }, [status]);

  return <>{children}</>;
};

export default LayoutMountWrapper;
