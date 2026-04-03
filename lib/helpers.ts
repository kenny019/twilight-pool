import { FailureResult, SuccessResult } from "./types";

type RetrySuccessResponse<T> = {
  success: true;
  data: T;
};

type RetryErrorResponse = {
  success: false;
  /** True when failCondition matched (e.g. order CANCELLED by relayer) */
  cancelled?: boolean;
};

const sleep = (delay: number) => new Promise((res) => setTimeout(res, delay));

/** Calculate progressive delay: starts at `base`, grows by 1.2x per attempt, caps at `base * 10` */
function progressiveDelay(base: number, attempt: number): number {
  const scaled = base * Math.pow(1.2, attempt);
  return Math.min(scaled, base * 10);
}

export async function retry<QueryReturn, QueryArgs = void>(
  query: (args: QueryArgs, ...rest: any[]) => QueryReturn,
  retries: number,
  args: QueryArgs,
  delay: number,
  condition?: (data: Awaited<QueryReturn>) => boolean,
  /** When true, fail immediately without retrying (e.g. CANCELLED status) */
  failCondition?: (data: Awaited<QueryReturn>) => boolean
): Promise<RetrySuccessResponse<Awaited<QueryReturn>> | RetryErrorResponse> {
  let outputData: NonNullable<Awaited<QueryReturn>> | undefined = undefined;
  let tryCount = 0;

  while (!outputData || tryCount < retries) {
    try {
      tryCount += 1;

      const response = await query(args);

      if (!response) {
        await sleep(progressiveDelay(delay, tryCount));
        continue;
      }

      outputData = response;

      if (failCondition?.(outputData)) {
        return { success: false, cancelled: true };
      }

      if (outputData && !condition) {
        break;
      }

      if (!condition) {
        continue;
      }

      const conditionResult = condition(outputData);

      if (conditionResult) {
        break;
      }

      await sleep(progressiveDelay(delay, tryCount));
      continue;
    } catch (err) {
      console.error("retry >> error", err);
      break;
    }
  }

  if (!outputData) {
    return {
      success: false,
    };
  }

  const isSuccess = condition ? condition(outputData) : !!outputData;

  if (isSuccess) {
    return {
      success: true,
      data: outputData,
    };
  }

  return {
    success: false,
  };
}

export function safeJSONParse<T>(
  toParse: string
): SuccessResult<T> | FailureResult {
  try {
    const result = JSON.parse(toParse);
    return {
      success: true,
      data: result as T,
    };
  } catch (err) {
    console.error(err);
    return {
      success: false,
      message: "failed to parse json",
    };
  }
}

const SECONDS_IN_YEAR = 31_536_000;
/** Minimum effective holding time for annualization. Prevents extreme ARR spikes for very recent deposits. */
const MIN_ANNUALIZATION_SECONDS = 7 * 24 * 60 * 60;

/**
 * Calculates annualized return (ARR) from rewards, principal, and time elapsed.
 * ARR is symmetric: positive or negative, reflecting actual performance.
 * Uses a 7-day minimum annualization window to avoid extreme spikes for new deposits.
 */
export function calculateAPR(params: {
  rewards: number;
  principal: number;
  timeElapsedSeconds: number;
}): number {
  const { rewards, principal, timeElapsedSeconds } = params;

  // Division-by-zero guards: return NaN so callers display "—"
  if (principal <= 0 || timeElapsedSeconds <= 0) return NaN;

  // Noise guard: negligible return (< 0.0001%) treated as 0 to reduce micro-noise
  const returnRatio = rewards / principal;
  if (Math.abs(returnRatio) < 1e-6) return 0;

  // Use minimum 7-day window for annualization to prevent extreme ARR for very recent deposits
  const effectiveSeconds = Math.max(
    timeElapsedSeconds,
    MIN_ANNUALIZATION_SECONDS
  );

  return (rewards / principal) * (SECONDS_IN_YEAR / effectiveSeconds) * 100;
}

export function isUserRejection(err: unknown): boolean {
  const message =
    err instanceof Error ? err.message : typeof err === "string" ? err : "";
  return /request rejected|user denied|rejected|declined/i.test(message);
}

export function capitaliseFirstLetter(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Truncates a transaction hash for display purposes
 * @param hash - The transaction hash to truncate
 * @param startLength - Number of characters to show at the start (default: 8)
 * @param endLength - Number of characters to show at the end (default: 8)
 * @param minLength - Minimum length before truncating (default: 16)
 * @returns The truncated hash or original if shorter than minLength
 */
/**
 * Formats sats as mBTC with up to 5 decimal places.
 * Use for small amounts (funding, fees) where BTC.format's 2-decimal mBTC loses precision.
 */
export function formatSatsMBtc(sats: number): string {
  if (!Number.isFinite(sats)) return "0";
  const mBtc = sats / 100_000; // 1 mBTC = 100,000 sats
  const s = mBtc.toFixed(5).replace(/\.?0+$/, "");
  return s === "-0" ? "0 mBTC" : `${s} mBTC`;
}

/**
 * Formats two margin sats values using the same unit.
 * If the larger value is >= 1 BTC (100M sats) both show in BTC,
 * otherwise both show in mBTC — so they're always directly comparable.
 */
export function formatMarginPair(a: number, b: number): [string, string] {
  const BTC_THRESHOLD = 100_000_000; // 1 BTC in sats
  const maxAbs = Math.max(Math.abs(a), Math.abs(b));

  const fmtBtc = (n: number) => {
    const v = (n / 100_000_000).toFixed(6).replace(/\.?0+$/, "");
    return `${v} BTC`;
  };
  const fmtMBtc = (n: number) => {
    const s = (n / 100_000).toFixed(5).replace(/\.?0+$/, "");
    return `${s === "-0" ? "0" : s} mBTC`;
  };

  return maxAbs >= BTC_THRESHOLD ? [fmtBtc(a), fmtBtc(b)] : [fmtMBtc(a), fmtMBtc(b)];
}

export function formatSatsCompact(
  sats: number,
  options?: { signed?: boolean }
): string {
  if (!Number.isFinite(sats)) return "0 BTC";

  const signed = options?.signed ?? false;
  const abs = Math.abs(sats);
  const prefix = signed && sats > 0 ? "+" : sats < 0 ? "-" : "";

  if (abs < 100_000) {
    return `${prefix}${abs.toFixed(0)} sats`;
  }

  if (abs < 1_000_000) {
    const value = (abs / 100_000).toFixed(3).replace(/\.?0+$/, "");
    return `${prefix}${value} mBTC`;
  }

  const value = (abs / 100_000_000).toFixed(6).replace(/\.?0+$/, "");
  return `${prefix}${value} BTC`;
}

export function truncateHash(
  hash: string | null | undefined,
  startLength: number = 8,
  endLength: number = 8,
  minLength: number = 16
): string {
  if (!hash || hash.length <= minLength) {
    return hash || "";
  }

  return `${hash.slice(0, startLength)}...${hash.slice(-endLength)}`;
}
