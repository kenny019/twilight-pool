import { WalletStatus } from "@cosmos-kit/core";
import { useWallet } from "@cosmos-kit/react-lite";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function useRedirectUnconnected() {
  // note: removed temporarily
  // const router = useRouter();
  // const { status } = useWallet();
  // useEffect(() => {
  //   if (status !== WalletStatus.Disconnected) {
  //     return;
  //   }
  //   const redirectTimeout = setTimeout(() => {
  //     router.push("/");
  //   }, 500);
  //   return () => clearTimeout(redirectTimeout);
  // }, [status]);
}
