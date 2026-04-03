import { LendOrder, TransactionHistory, ZkAccount } from "@/lib/types";

export function markLendWithdrawalPending(order: LendOrder): LendOrder {
  return {
    ...order,
    withdrawPending: true,
  };
}

export function completeLendWithdrawal(params: {
  order: LendOrder;
  value: number;
  payment: number;
  txHash?: string;
  timestamp?: Date;
}): LendOrder {
  return {
    ...params.order,
    orderStatus: "SETTLED",
    withdrawPending: false,
    timestamp: params.timestamp ?? new Date(),
    tx_hash: params.txHash,
    value: params.value,
    payment: params.payment,
  };
}

export function createRelayerSettleHistoryEntry(params: {
  accountAddress: string;
  accountTag: string;
  txHash?: string;
  value: number;
  date?: Date;
  fundingSatsSnapshot?: number | null;
}): TransactionHistory {
  return {
    date: params.date ?? new Date(),
    from: params.accountAddress,
    fromTag: params.accountTag,
    to: params.accountAddress,
    toTag: params.accountTag,
    tx_hash: params.txHash ?? "",
    value: params.value,
    type: "Withdraw Lend",
    ...(params.fundingSatsSnapshot === undefined
      ? {}
      : { funding_sats_snapshot: params.fundingSatsSnapshot }),
  };
}

export function createStagedTransferHistoryEntry(params: {
  fromAddress: string;
  fromTag: string;
  toAddress: string;
  toTag: string;
  txId: string;
  value: number;
  date?: Date;
  fromType?: string;
  toType?: string;
  fundingSatsSnapshot?: number | null;
}): TransactionHistory {
  return {
    date: params.date ?? new Date(),
    from: params.fromAddress,
    fromTag: params.fromTag,
    to: params.toAddress,
    toTag: params.toTag,
    ...(params.fromType === undefined ? {} : { fromType: params.fromType }),
    ...(params.toType === undefined ? {} : { toType: params.toType }),
    tx_hash: params.txId,
    value: params.value,
    type: "Transfer",
    ...(params.fundingSatsSnapshot === undefined
      ? {}
      : { funding_sats_snapshot: params.fundingSatsSnapshot }),
  };
}

export function createFundingBurnHistoryEntry(params: {
  fromAddress: string;
  fromTag: string;
  twilightAddress: string;
  txHash: string;
  value: number;
  date?: Date;
  fundingSatsSnapshot?: number | null;
}): TransactionHistory {
  return {
    date: params.date ?? new Date(),
    from: params.fromAddress,
    fromTag: params.fromTag,
    to: params.twilightAddress,
    toTag: "Funding",
    tx_hash: params.txHash,
    value: params.value,
    type: "Burn",
    ...(params.fundingSatsSnapshot === undefined
      ? {}
      : { funding_sats_snapshot: params.fundingSatsSnapshot }),
  };
}

export function buildRecoverableLendAccount(params: {
  account: ZkAccount;
  value: number;
}): ZkAccount {
  return {
    ...params.account,
    type: "CoinSettled",
    value: params.value,
  };
}

export function buildStagedFundingAccount(params: {
  account: ZkAccount;
  updatedAddress: string;
  updatedScalar: string;
  value: number;
}): ZkAccount {
  return {
    type: "Coin",
    address: params.updatedAddress,
    scalar: params.updatedScalar,
    isOnChain: true,
    value: params.value,
    tag: params.account.tag,
  };
}

export function buildBurnReadyFundingAccount(params: {
  account: ZkAccount;
  zkAccountHex: string;
}): ZkAccount {
  return {
    ...params.account,
    isOnChain: false,
    zkAccountHex: params.zkAccountHex,
  };
}
