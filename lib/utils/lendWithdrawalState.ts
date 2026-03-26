import { LendOrder } from "@/lib/types";

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
