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

async function generateZeroTradingAccountFromHexAddress({
  tradingHexAddress,
}: {
  tradingHexAddress: string;
}) {
  const zkos = await import("zkos-wasm");
  return zkos.generateZeroTradingAccountFromAddress(tradingHexAddress);
}

async function addressMonitoring(signature: string, utxos: string) {
  const zkos = await import("zkos-wasm");
  return zkos.coinAddressMonitoring(utxos, signature);
}

export {
  generatePublicKey,
  generatePublicKeyHexAddress,
  generateZeroTradingAccountFromHexAddress,
  addressMonitoring,
};
