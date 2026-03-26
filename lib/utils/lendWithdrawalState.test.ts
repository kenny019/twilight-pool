import { describe, expect, it } from "vitest";
import {
  completeLendWithdrawal,
  markLendWithdrawalPending,
} from "./lendWithdrawalState";

const baseOrder = {
  uuid: "lend-1",
  accountAddress: "account-1",
  orderStatus: "LENDED",
  value: 1,
  payment: 0,
  timestamp: new Date("2026-03-01T00:00:00Z"),
  tx_hash: "old-hash",
};

describe("lendWithdrawalState", () => {
  it("keeps a settled lend visible as pending until the funding burn completes", () => {
    expect(markLendWithdrawalPending(baseOrder)).toEqual({
      ...baseOrder,
      withdrawPending: true,
    });
  });

  it("completes the lend withdrawal only after the funding burn metadata exists", () => {
    const timestamp = new Date("2026-03-24T00:00:00Z");

    expect(
      completeLendWithdrawal({
        order: {
          ...baseOrder,
          withdrawPending: true,
        },
        value: 25,
        payment: 3,
        txHash: "new-hash",
        timestamp,
      })
    ).toEqual({
      ...baseOrder,
      orderStatus: "SETTLED",
      withdrawPending: false,
      value: 25,
      payment: 3,
      tx_hash: "new-hash",
      timestamp,
    });
  });
});
