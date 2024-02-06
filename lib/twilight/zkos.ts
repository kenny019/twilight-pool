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

async function createInputCoinFromOutput({
  outputString,
  utxoString,
}: {
  outputString: string;
  utxoString: string;
}) {
  const zkos = await import("@kenny019/zkos-wasm");
  return zkos.createInputCoinFromOutput(outputString, utxoString);
}

async function createTraderOrder({
  inputString,
  scriptAddress,
  signature,
  scalar,
  value,
  positionType,
  orderType,
  leverage,
  entryPrice,
  timebounds,
}: {
  inputString: string;
  scriptAddress: string;
  signature: string;
  scalar: string;
  value: number;
  positionType: "LONG" | "SHORT";
  orderType: "LIMIT" | "MARKET" | "DARK" | "LEND";
  leverage: number;
  entryPrice?: number;
  timebounds: number;
}) {
  if (orderType === "LIMIT" && !entryPrice) {
    return "";
  }

  const zkos = await import("@kenny019/zkos-wasm");
  return zkos.createZkOSTraderOrder(
    inputString,
    scriptAddress,
    signature,
    scalar,
    BigInt(value),
    positionType,
    orderType,
    leverage,
    entryPrice || 0,
    timebounds
  );
}

export {
  generatePublicKey,
  generateHexAddressFromPublicKey,
  generateZeroBalanceTradingAccount,
  generateRandomScalar,
  generateTradingAccountAddress,
  generateTradingAccount,
  getTradingAddressFromTradingAccount,
  getZKAccountHexFromOutputString,
  utxoStringToHex,
  createInputCoinFromOutput,
  decryptZKAccountHexValue,
  createTraderOrder,
};
