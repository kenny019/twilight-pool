async function generatePublicKey({ signature }: { signature: string }) {
  const zkos = await import("@kenny019/zkos-wasm");
  return zkos.generatePublicKeyFromSignature(signature);
}

async function generateHexAddressFromPublicKey({
  publicKey,
}: {
  publicKey: string;
}) {
  const zkos = await import("@kenny019/zkos-wasm");
  return zkos.hexStandardAddressFromPublicKey(12, publicKey);
}

async function generateTradingAccountAddress({
  publicKeyHex,
}: {
  publicKeyHex: string;
}) {
  const zkos = await import("@kenny019/zkos-wasm");
  return zkos.generateNewRandomAddress(publicKeyHex);
}

async function generateZeroBalanceTradingAccount({
  tradingAccountAddress,
}: {
  tradingAccountAddress: string;
}) {
  const zkos = await import("@kenny019/zkos-wasm");
  return zkos.generateZeroBalaneZkAccountFromAddress(tradingAccountAddress);
}

async function generateTradingAccount({
  publicKeyHex,
  balance,
  scalar,
}: {
  publicKeyHex: string;
  balance: number;
  scalar: string;
}) {
  const zkos = await import("@kenny019/zkos-wasm");
  return zkos.generateZkAccountWithBalance(publicKeyHex, balance, scalar);
}

async function getTradingAddressFromTradingAccount({
  tradingAccountAddress,
}: {
  tradingAccountAddress: string;
}) {
  const zkos = await import("@kenny019/zkos-wasm");
  return zkos.getAddressFromZkAccountHex(tradingAccountAddress);
}

async function generateRandomScalar() {
  const zkos = await import("@kenny019/zkos-wasm");
  return zkos.generateRandomScalar();
}

export {
  generatePublicKey,
  generateHexAddressFromPublicKey,
  generateZeroBalanceTradingAccount,
  generateRandomScalar,
  generateTradingAccountAddress,
  generateTradingAccount,
  // generateTradingAccountWithBalance,
  getTradingAddressFromTradingAccount,
};
