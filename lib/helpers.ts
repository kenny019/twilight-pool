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
