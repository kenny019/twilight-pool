import { TradeOrder, ZkAccount } from "../types";

export function isTerminalRecoveryTradeStatus(orderStatus?: string): boolean {
  return orderStatus === "SETTLED" || orderStatus === "CANCELLED";
}

export function buildPersistedTerminalTradeAccount({
  currentAccount,
  orderStatus,
  availableMargin,
}: {
  currentAccount: ZkAccount;
  orderStatus: string;
  availableMargin: number;
}): ZkAccount {
  const type: ZkAccount["type"] =
    orderStatus === "CANCELLED" ? "Coin" : "CoinSettled";

  return {
    ...currentAccount,
    type,
    value: Math.round(availableMargin),
  };
}

export function shouldPersistTerminalTradeAccount(
  currentAccount: ZkAccount,
  nextAccount: ZkAccount
): boolean {
  return (
    currentAccount.type !== nextAccount.type ||
    currentAccount.value !== nextAccount.value
  );
}

export function buildManualRecoveryTransferAccount({
  zkAccount,
  trade,
}: {
  zkAccount: ZkAccount;
  trade?: TradeOrder;
}): ZkAccount {
  const transferAmount =
    trade && isTerminalRecoveryTradeStatus(trade.orderStatus)
      ? Math.round(trade.availableMargin)
      : (zkAccount.value ?? 0);

  return {
    ...zkAccount,
    value: transferAmount,
  };
}

export function shouldNotifyCleanupFailure(
  notifiedAccounts: Set<string>,
  accountAddress: string
): boolean {
  if (notifiedAccounts.has(accountAddress)) {
    return false;
  }

  notifiedAccounts.add(accountAddress);
  return true;
}
