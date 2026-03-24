import { describe, expect, it } from "vitest";
import { assertCosmosTxSuccess, isCosmosTxSuccess } from "./cosmosTx";

describe("cosmosTx", () => {
  it("accepts successful Cosmos tx responses", () => {
    const result = {
      code: 0,
      transactionHash: "ABC123",
      rawLog: "[]",
    };

    expect(isCosmosTxSuccess(result)).toBe(true);
    expect(assertCosmosTxSuccess(result, "Test transfer")).toEqual(result);
  });

  it("rejects failed Cosmos tx responses", () => {
    expect(() =>
      assertCosmosTxSuccess(
        {
          code: 5,
          transactionHash: "ABC123",
          rawLog: "out of gas",
        },
        "Test transfer"
      )
    ).toThrow("Test transfer failed with code 5. out of gas");
  });

  it("rejects malformed Cosmos tx responses", () => {
    expect(() => assertCosmosTxSuccess(null, "Test transfer")).toThrow(
      "Test transfer returned an invalid transaction response."
    );

    expect(() =>
      assertCosmosTxSuccess(
        {
          code: 0,
        },
        "Test transfer"
      )
    ).toThrow("Test transfer succeeded without a transaction hash.");
  });
});
