import { useQuery } from "@tanstack/react-query";
import { WalletStatus } from "@cosmos-kit/core";
import { useWallet } from "@cosmos-kit/react-lite";
import { queryUtxoForAddress } from "@/lib/api/zkos";
import { useSessionStore } from "@/lib/providers/session";
import {
  useIsStoreHydrated,
  useTwilightStore,
  useTwilightStoreApi,
} from "@/lib/providers/store";
import { hasUtxoData } from "@/lib/utils/waitForUtxoUpdate";
import { resolvePendingMasterAccount } from "@/lib/utils/masterAccountRecovery";

export function useRecoverPendingMasterAccount() {
  const storeApi = useTwilightStoreApi();
  const pendingMasterAccount = useTwilightStore(
    (state) => state.zk.pendingMasterAccount
  );
  const masterAccountBlocked = useTwilightStore(
    (state) => state.zk.masterAccountBlocked
  );
  const clearMasterAccountRecovery = useTwilightStore(
    (state) => state.zk.clearMasterAccountRecovery
  );
  const updateZkAccount = useTwilightStore((state) => state.zk.updateZkAccount);
  const addZkAccount = useTwilightStore((state) => state.zk.addZkAccount);

  const privateKey = useSessionStore((state) => state.privateKey);
  const isHydrated = useIsStoreHydrated();
  const { status, mainWallet } = useWallet();
  const twilightAddress = mainWallet?.getChainWallet("nyks")?.address;

  useQuery({
    queryKey: [
      "recover-pending-master-account",
      twilightAddress,
      pendingMasterAccount?.address,
      pendingMasterAccount?.createdAt,
      masterAccountBlocked,
    ],
    queryFn: async () => {
      if (!pendingMasterAccount) return false;

      const utxoResult = await queryUtxoForAddress(pendingMasterAccount.address);
      if (!hasUtxoData(utxoResult)) {
        return false;
      }

      const currentMain = storeApi.getState().zk.zkAccounts.find(
        (account) => account.tag === "main"
      );

      // Already resolved by a previous tick — just clear recovery state.
      if (currentMain?.address === pendingMasterAccount.address) {
        clearMasterAccountRecovery();
        return true;
      }

      const resolvedMain = resolvePendingMasterAccount(
        currentMain,
        pendingMasterAccount
      );

      if (currentMain) {
        updateZkAccount(currentMain.address, resolvedMain);
      } else {
        addZkAccount(resolvedMain);
      }

      clearMasterAccountRecovery();
      return true;
    },
    enabled:
      status === WalletStatus.Connected &&
      !!twilightAddress &&
      !!privateKey &&
      isHydrated &&
      masterAccountBlocked &&
      !!pendingMasterAccount,
    refetchInterval: masterAccountBlocked ? 5000 : false,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}
