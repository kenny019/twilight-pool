export function decodeUnlockHeightFromBtcScript(scriptHex: string): number {
  const normalized = scriptHex.toLowerCase().replace(/\s+/g, "");

  if (normalized.length % 2 !== 0 || !normalized.endsWith("b1")) {
    throw new Error("expected OP_CHECKLOCKTIMEVERIFY (0xb1) tail");
  }

  const withoutCltv = normalized.slice(0, -2);

  for (let n = 1; n <= 4; n++) {
    const opcodePos = withoutCltv.length - (2 * n + 2);
    if (opcodePos < 0) continue;

    const opcodeByte = withoutCltv.slice(opcodePos, opcodePos + 2);
    if (parseInt(opcodeByte, 16) === n) {
      const valueLE = withoutCltv.slice(opcodePos + 2);
      const bytes = valueLE.match(/.{2}/g) ?? [];
      return parseInt(bytes.reverse().join(""), 16);
    }
  }

  throw new Error("could not locate push opcode before OP_CLTV");
}
