type RetrySuccessResponse<T> = {
  success: true;
  data: T;
};

type RetryErrorResponse = {
  success: false;
};

export async function retry<QueryReturn, QueryArgs = void>(
  query: (...args: QueryArgs[]) => QueryReturn,
  retries: number,
  args: QueryArgs,
  condition?: (data: Awaited<QueryReturn>) => boolean
): Promise<RetrySuccessResponse<Awaited<QueryReturn>> | RetryErrorResponse> {
  let outputData: NonNullable<Awaited<QueryReturn>> | undefined = undefined;
  let tryCount = 0;

  while (!outputData) {
    try {
      if (tryCount > retries) break;

      tryCount += 1;

      const response = await query(args);

      if (!response) {
        continue;
      }

      outputData = response;

      if (!condition) {
        break;
      }

      const conditionResult = condition(outputData);

      console.log("conditionResult", conditionResult);

      if (conditionResult) {
        return {
          success: true,
          data: outputData,
        };
      }

      console.log("not conditionResult retrying", conditionResult, tryCount);

      continue;
    } catch (err) {
      console.error("error", err);
      break;
    }
  }

  if (!outputData) {
    return {
      success: false,
    };
  }

  return {
    success: true,
    data: outputData,
  };
}
