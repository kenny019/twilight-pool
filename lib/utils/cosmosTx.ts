type CosmosTxResult = {
  code?: number;
  transactionHash?: string;
  rawLog?: string;
};

type CosmosTxSuccessResult = CosmosTxResult & {
  code: 0;
  transactionHash: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object";
}

export function isCosmosTxSuccess(
  result: unknown
): result is CosmosTxSuccessResult {
  return (
    isRecord(result) &&
    typeof result.code === "number" &&
    result.code === 0 &&
    typeof result.transactionHash === "string" &&
    result.transactionHash.length > 0
  );
}

export function assertCosmosTxSuccess(
  result: unknown,
  context: string
): CosmosTxSuccessResult {
  if (!isRecord(result)) {
    throw new Error(`${context} returned an invalid transaction response.`);
  }

  const { code, transactionHash, rawLog } = result as CosmosTxResult;

  if (typeof code !== "number") {
    throw new Error(`${context} did not return a transaction code.`);
  }

  if (code !== 0) {
    const detail =
      typeof rawLog === "string" && rawLog.trim().length > 0
        ? ` ${rawLog.trim()}`
        : "";
    throw new Error(`${context} failed with code ${code}.${detail}`);
  }

  if (typeof transactionHash !== "string" || transactionHash.length < 1) {
    throw new Error(`${context} succeeded without a transaction hash.`);
  }

  return {
    code,
    transactionHash,
    rawLog,
  };
}
