import { describe, expect, it } from "vitest";
import { decodeUnlockHeightFromBtcScript } from "./btcScript";

describe("decodeUnlockHeightFromBtcScript", () => {
  it("decodes the round-56 sample tail", () => {
    expect(decodeUnlockHeightFromBtcScript("56af0300690eb1")).toBe(944384);
  });

  it("decodes a round-67 live-response tail", () => {
    expect(decodeUnlockHeightFromBtcScript("56af03306f0eb1")).toBe(945968);
  });

  it("decodes a round-66 live-response tail", () => {
    expect(decodeUnlockHeightFromBtcScript("56af03a06e0eb1")).toBe(945824);
  });

  it("throws when the OP_CLTV push is missing", () => {
    expect(() => decodeUnlockHeightFromBtcScript("b1")).toThrow(
      "could not locate push opcode before OP_CLTV"
    );
  });

  it("throws when OP_CLTV terminator is absent", () => {
    expect(() => decodeUnlockHeightFromBtcScript("deadbeef")).toThrow(
      "expected OP_CHECKLOCKTIMEVERIFY (0xb1) tail"
    );
  });

  it("decodes a synthesized 4-byte push (heights > 2^23)", () => {
    expect(decodeUnlockHeightFromBtcScript("0400000001b1")).toBe(16777216);
  });
});
