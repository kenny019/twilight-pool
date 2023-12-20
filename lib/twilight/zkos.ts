async function generatePublicKey({ signature }: { signature: string }) {
  const zkos = await import("zkos-wasm");
  return zkos.generatePublicKeyFromSignature(signature);
}

async function generatePublicKeyHexAddress({
  publicKey,
}: {
  publicKey: string;
}) {
  const zkos = await import("zkos-wasm");
  return zkos.hexStandardAddressFromPublicKey(12, publicKey);
}

export { generatePublicKey, generatePublicKeyHexAddress };
