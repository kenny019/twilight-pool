async function generatePublicKey({ signature }: { signature: string }) {
  const zkos = await import("@kenny019/zkos-wasm");
  return zkos.generatePublicKeyFromSignature(signature);
}

async function generatePublicKeyHexAddress({
  publicKey,
}: {
  publicKey: string;
}) {
  const zkos = await import("@kenny019/zkos-wasm");
  return zkos.hexStandardAddressFromPublicKey(12, publicKey);
}

async function generateZeroTradingAccount({
  publicKeyHex,
}: {
  publicKeyHex: string;
}) {
  const zkos = await import("@kenny019/zkos-wasm");
  return zkos.generateZeroAccount(publicKeyHex);
}

async function generateRandomScalar() {
  const zkos = await import("@kenny019/zkos-wasm");
  return zkos.generateRandomScalar();
}

// async function generateTradingAccountWithBalance({
//   publicKeyHex,
//   balance,
//   scalar,
// }: {
//   publicKeyHex: string;
//   balance: number;
//   scalar: string;
// }) {
//   const zkos = await import("@kenny019/zkos-wasm");
//   return zkos.generateZkAccountWithBalance(publicKeyHex, balance, scalar);
// }

export {
  generatePublicKey,
  generatePublicKeyHexAddress,
  generateZeroTradingAccount,
  generateRandomScalar,
  // generateTradingAccountWithBalance,
};
