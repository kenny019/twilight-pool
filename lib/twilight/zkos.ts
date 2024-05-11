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
  programContract,
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
  programContract: string;
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

  console.log("createTraderOrder Inputs", {
    inputString,
    programContract,
    signature,
    scalar,
    value: BigInt(value),
    positionType,
    orderType,
    leverage,
    entrpyPrice: entryPrice || 0,
    timebounds,
  });

  return zkos.createZkOSTraderOrder(
    inputString,
    programContract,
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

async function createZkOSLendOrder({
  inputString,
  signature,
  scriptAddress,
  scalar,
  deposit,
}: {
  inputString: string;
  signature: string;
  scriptAddress: string;
  scalar: string;
  deposit: number;
}) {
  const zkos = await import("@kenny019/zkos-wasm");
  return zkos.createZkOSLendOrder(
    inputString,
    signature,
    scriptAddress,
    scalar,
    BigInt(deposit)
  );
}

async function createTradingTxSingle({
  signature,
  senderInput,
  receiverAddress,
  amount,
  updatedSenderBalance,
}: {
  signature: string;
  senderInput: string;
  receiverAddress: string;
  amount: number;
  updatedSenderBalance: number;
}) {
  const zkos = await import("@kenny019/zkos-wasm");
  return zkos.privateTransactionSingle(
    signature,
    senderInput,
    receiverAddress,
    BigInt(amount),
    false,
    BigInt(updatedSenderBalance),
    BigInt(1)
  );
}

async function createQueryTradeOrderMsg({
  address,
  signature,
  orderStatus,
}: {
  address: string;
  signature: string;
  orderStatus: string;
}) {
  const zkos = await import("@kenny019/zkos-wasm");
  return zkos.queryTraderOrderZkos(address, signature, orderStatus);
}

async function createQueryLendOrderMsg({
  address,
  signature,
}: {
  address: string;
  signature: string;
}) {
  const zkos = await import("@kenny019/zkos-wasm");
  return zkos.queryLendOrderZkos(address, signature, "PENDING");
}

async function verifyAccount({
  zkAccountHex,
  signature,
  balance,
}: {
  zkAccountHex: string;
  signature: string;
  balance: number;
}) {
  const zkos = await import("@kenny019/zkos-wasm");
  return zkos.verifyZkAccount(signature, zkAccountHex, balance);
}

async function verifyQuisQuisTransaction({ tx }: { tx: string }) {
  const zkos = await import("@kenny019/zkos-wasm");
  return zkos.verifyQuisQuisTransaction(tx);
}

async function createBurnMessageTx({
  inputString,
  amount,
  scalar,
  signature,
  address,
}: {
  inputString: string;
  amount: number;
  scalar: string;
  signature: string;
  address: string;
}) {
  const zkos = await import("@kenny019/zkos-wasm");
  return zkos.createBurnMessageTransaction(
    inputString,
    BigInt(amount),
    scalar,
    signature,
    address
  );
}

async function executeTradeLendOrderMsg({
  outputMemo,
  signature,
  address,
  uuid,
  orderType,
  orderStatus,
  executionPricePoolshare,
  transactionType,
}: {
  outputMemo: string;
  signature: string;
  address: string;
  uuid: string;
  orderType: string;
  orderStatus: string;
  executionPricePoolshare: number;
  transactionType: "ORDERTX" | "LENDTX";
}) {
  const zkos = await import("@kenny019/zkos-wasm");
  return zkos.executeTradeLendOrderZkOS(
    outputMemo,
    signature,
    address,
    uuid,
    orderType,
    orderStatus,
    executionPricePoolshare,
    transactionType
  );
}

async function coinAddressMonitoring({
  utxoOutputString,
  signature,
}: {
  utxoOutputString: string;
  signature: string;
}) {
  const zkos = await import("@kenny019/zkos-wasm");
  return zkos.coinAddressMonitoring(utxoOutputString, signature);
}

/**
 *
 * @returns stringified tuple of addresses, 0 index is sender 1 index is receiver
 */
async function getUpdatedAddressFromTransaction({
  signature,
  txHex,
}: {
  signature: string;
  txHex: string;
}) {
  const zkos = await import("@kenny019/zkos-wasm");
  return zkos.getUpdatedAddressesFromTransaction(signature, txHex);
}

async function createShuffleTransactionSingle({
  signature,
  senderInput,
  receiverAddress,
  amount,
  updatedSenderBalance,
  anonymitySet,
}: {
  signature: string;
  senderInput: string;
  receiverAddress: string;
  amount: number;
  updatedSenderBalance: number;
  anonymitySet: string;
}) {
  const zkos = await import("@kenny019/zkos-wasm");
  return zkos.createQuisQuisTransactionSingle(
    signature,
    senderInput,
    receiverAddress,
    BigInt(amount),
    false,
    BigInt(updatedSenderBalance),
    anonymitySet,
    BigInt(1)
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
  createTradingTxSingle,
  createQueryTradeOrderMsg,
  createQueryLendOrderMsg,
  createZkOSLendOrder,
  executeTradeLendOrderMsg,
  coinAddressMonitoring,
  createBurnMessageTx,
  getUpdatedAddressFromTransaction,
  createShuffleTransactionSingle,
  verifyQuisQuisTransaction,
  verifyAccount,
};
