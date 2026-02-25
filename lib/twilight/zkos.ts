let zkos: Awaited<typeof import("@twilight-dev/zkos-wasm")> | null = null;

export async function initZkos() {
  if (!zkos) {
    const wasm = await import("@twilight-dev/zkos-wasm");
    await wasm.default(); // this initializes the wasm module
    zkos = wasm;
  }
  return zkos!;
}

async function generatePublicKey({ signature }: { signature: string }) {
  const zkos = await initZkos();
  return zkos.generatePublicKeyFromSignature(signature);
}

async function generateHexAddressFromPublicKey({
  publicKey,
}: {
  publicKey: string;
}) {
  const zkos = await initZkos();
  return zkos.hexStandardAddressFromPublicKey(12, publicKey);
}

async function generateTradingAccountAddress({
  publicKeyHex,
}: {
  publicKeyHex: string;
}) {
  const zkos = await initZkos();
  return zkos.generateNewRandomAddress(publicKeyHex);
}

async function generateZeroBalanceTradingAccount({
  tradingAccountAddress,
}: {
  tradingAccountAddress: string;
}) {
  const zkos = await initZkos();
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
  const zkos = await initZkos();
  return zkos.generateZkAccountWithBalance(publicKeyHex, balance, scalar);
}

async function getTradingAddressFromTradingAccount({
  tradingAccountAddress,
}: {
  tradingAccountAddress: string;
}) {
  const zkos = await initZkos();
  return zkos.getAddressFromZkAccountHex(tradingAccountAddress);
}

async function generateRandomScalar() {
  const zkos = await initZkos();
  return zkos.generateRandomScalar();
}

async function utxoStringToHex({ utxoString }: { utxoString: string }) {
  const zkos = await initZkos();
  return zkos.getUtxoHexFromJson(utxoString);
}

async function getZKAccountHexFromOutputString({
  outputString,
}: {
  outputString: string;
}) {
  const zkos = await initZkos();
  return zkos.extractZkAccountFromOutput(outputString);
}

async function decryptZKAccountHexValue({
  zkAccountHex,
  signature,
}: {
  zkAccountHex: string;
  signature: string;
}) {
  const zkos = await initZkos();
  return zkos.decryptZkAccountValue(signature, zkAccountHex);
}

async function createInputCoinFromOutput({
  outputString,
  utxoString,
}: {
  outputString: string;
  utxoString: string;
}) {
  const zkos = await initZkos();
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

  const zkos = await initZkos();

  console.log("createTraderOrder Inputs", {
    inputString,
    programContract,
    signature,
    scalar,
    value: BigInt(Math.floor(value)),
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
    BigInt(Math.floor(value)),
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
  const zkos = await initZkos();
  return zkos.createZkOSLendOrder(
    inputString,
    signature,
    scriptAddress,
    scalar,
    BigInt(Math.floor(deposit))
  );
}

async function createTradingTxSingle({
  signature,
  senderInput,
  receiverAddress,
  amount,
  updatedSenderBalance,
  isReceiverInput,
}: {
  signature: string;
  senderInput: string;
  receiverAddress: string;
  amount: number;
  updatedSenderBalance: number;
  isReceiverInput: boolean;
}) {
  const zkos = await initZkos();
  return zkos.privateTransactionSingle(
    signature,
    senderInput,
    receiverAddress,
    BigInt(Math.floor(amount)),
    isReceiverInput, // input has to be true if receiver account exists
    BigInt(Math.floor(updatedSenderBalance)),
    BigInt(1)
  );
}

async function createCancelTraderOrderMsg({
  address,
  signature,
  uuid,
}: {
  address: string;
  signature: string;
  uuid: string;
}) {
  const zkos = await initZkos();
  console.log(address, signature, uuid);
  return zkos.cancelTraderOrderZkOS(address, signature, JSON.stringify(uuid));
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
  const zkos = await initZkos();
  return zkos.queryTraderOrderZkos(address, signature, orderStatus);
}

async function createQueryLendOrderMsg({
  address,
  signature,
  orderStatus,
}: {
  address: string;
  signature: string;
  orderStatus: string;
}) {
  const zkos = await initZkos();
  return zkos.queryLendOrderZkos(address, signature, orderStatus);
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
  const zkos = await initZkos();
  return zkos.verifyZkAccount(signature, zkAccountHex, balance);
}

async function verifyQuisQuisTransaction({ tx }: { tx: string }) {
  const zkos = await initZkos();
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
  const zkos = await initZkos();
  return zkos.createBurnMessageTransaction(
    inputString,
    BigInt(Math.floor(amount)),
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
  const zkos = await initZkos();
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
  const zkos = await initZkos();
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
  const zkos = await initZkos();
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
  const zkos = await initZkos();
  return zkos.createQuisQuisTransactionSingle(
    signature,
    senderInput,
    receiverAddress,
    BigInt(Math.floor(amount)),
    false,
    BigInt(Math.floor(updatedSenderBalance)),
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
  createCancelTraderOrderMsg,
};
