import { FailureResult, SuccessResult } from "./types";

type RetrySuccessResponse<T> = {
  success: true;
  data: T;
};

type RetryErrorResponse = {
  success: false;
};

const sleep = (delay: number) => new Promise((res) => setTimeout(res, delay));

export async function retry<QueryReturn, QueryArgs = void>(
  query: (...args: QueryArgs[]) => QueryReturn,
  retries: number,
  args: QueryArgs,
  delay: number,
  condition?: (data: Awaited<QueryReturn>) => boolean
): Promise<RetrySuccessResponse<Awaited<QueryReturn>> | RetryErrorResponse> {
  let outputData: NonNullable<Awaited<QueryReturn>> | undefined = undefined;
  let tryCount = 0;

  while (!outputData || tryCount < retries) {
    try {
      tryCount += 1;

      console.log(`retrying ${tryCount} / ${retries}`);

      const response = await query(args);

      if (!response) {
        await sleep(delay);
        continue;
      }

      outputData = response;

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

      await sleep(delay);
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
