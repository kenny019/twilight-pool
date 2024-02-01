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

async function utxoStringToHex({ utxoString }: { utxoString: string }) {
  const zkos = await import("@kenny019/zkos-wasm");
  return zkos.getUtxoHexFromJson(utxoString);
}

async function getZKAccountHexFromOutputString({
  outputString,
}: {
  outputString: string;
}) {
  const zkos = await import("@kenny019/zkos-wasm");
  return zkos.extractZkAccountFromOutput(outputString);
}

async function decryptZKAccountHexValue({
  zkAccountHex,
  signature,
}: {
  zkAccountHex: string;
  signature: string;
}) {
  const zkos = await import("@kenny019/zkos-wasm");
  return zkos.decryptZkAccountValue(signature, zkAccountHex);
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
  getZKAccountHexFromOutputString,
  utxoStringToHex,
  decryptZKAccountHexValue,
};
