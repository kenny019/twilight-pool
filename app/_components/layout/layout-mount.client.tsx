"use client";
import { getBTCDepositAddress } from "@/lib/rest";
import { useWallet } from "@cosmos-kit/react-lite";
import { usePathname, useRouter } from "next/navigation";
import React, { useEffect } from "react";

const LayoutMountWrapper = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const path = usePathname();

  const { mainWallet, status } = useWallet();

  useEffect(() => {
    async function autoConnect() {
      if (status !== "Connected" || !mainWallet) return;
      const chainWallet = mainWallet.getChainWallet("nyks");
      const address = chainWallet?.address || "";

      if (path === "/registration" || !address) return;

      const { success } = await getBTCDepositAddress(address);

      if (success || process.env.NEXT_PUBLIC_ENVIRONMENT === "dev") return;

      // redirect user to /registration
      router.push("/registration");
    }

    autoConnect();
  }, [status]);

  return <>{children}</>;
};

export default LayoutMountWrapper;
