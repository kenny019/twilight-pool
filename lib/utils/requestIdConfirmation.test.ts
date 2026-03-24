import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TransactionHash } from "@/lib/api/rest";
import {
  getConfirmedRequestEvent,
  hasFailedRequestEvent,
  waitForRequestIdConfirmation,
} from "./requestIdConfirmation";

const { retryMock, queryTransactionHashByRequestIdMock } = vi.hoisted(() => ({
  retryMock: vi.fn(),
  queryTransactionHashByRequestIdMock: vi.fn(),
}));

vi.mock("@/lib/helpers", () => ({
  retry: retryMock,
}));

vi.mock("@/lib/api/rest", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api/rest")>(
    "@/lib/api/rest"
  );

  return {
    ...actual,
    queryTransactionHashByRequestId: queryTransactionHashByRequestIdMock,
  };
});

const confirmedEvent: TransactionHash = {
  account_id: "account-1",
  datetime: "2026-03-24T00:00:00Z",
  id: 1,
  order_id: "order-1",
  order_status: "PENDING",
  order_type: "LIMIT",
  output: "output",
  reason: null,
  old_price: null,
  new_price: null,
  request_id: "request-1",
  tx_hash: "tx-1",
};

describe("requestIdConfirmation", () => {
  beforeEach(() => {
    retryMock.mockReset();
    queryTransactionHashByRequestIdMock.mockReset();
  });

  it("confirms only fresh non-error events that are not excluded", () => {
    const result = {
      result: [
        {
          ...confirmedEvent,
          order_id: "old-order",
          order_type: "SLTP",
        },
        confirmedEvent,
      ],
    };

    expect(
      getConfirmedRequestEvent(result, {
        excludedOrderTypes: ["SLTP"],
      })
    ).toEqual(confirmedEvent);
  });

  it("detects cancelled and rejected request-id responses", () => {
    expect(
      hasFailedRequestEvent({
        result: [
          {
            ...confirmedEvent,
            order_status: "CANCELLED",
          },
        ],
      })
    ).toBe(true);

    expect(
      hasFailedRequestEvent({
        result: [
          {
            ...confirmedEvent,
            order_status: "RejectedByRelayer",
          },
        ],
      })
    ).toBe(true);
  });

  it("returns the confirmed request-id event when retry succeeds", async () => {
    retryMock.mockResolvedValue({
      success: true,
      data: {
        result: [confirmedEvent],
      },
    });

    await expect(
      waitForRequestIdConfirmation("request-1", {
        excludedOrderTypes: ["SLTP"],
      })
    ).resolves.toEqual({
      success: true,
      event: confirmedEvent,
    });

    expect(retryMock).toHaveBeenCalledWith(
      queryTransactionHashByRequestIdMock,
      30,
      "request-1",
      1000,
      expect.any(Function),
      expect.any(Function)
    );
  });

  it("returns a cancelled result when retry detects a failed request", async () => {
    retryMock.mockResolvedValue({
      success: false,
      cancelled: true,
    });

    await expect(waitForRequestIdConfirmation("request-1")).resolves.toEqual({
      success: false,
      cancelled: true,
      message: "Request was cancelled before confirmation.",
    });
  });
});
