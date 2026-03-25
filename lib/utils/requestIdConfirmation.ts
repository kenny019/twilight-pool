import {
  TransactionHash,
  isCancelStatus,
  isErrorStatus,
  queryTransactionHashByRequestId,
} from "@/lib/api/rest";
import { retry } from "@/lib/helpers";
import type { OrderTypes } from "@/lib/types";

type TransactionHashQueryResult = Awaited<
  ReturnType<typeof queryTransactionHashByRequestId>
>;

export function getConfirmedRequestEvent(
  result: TransactionHashQueryResult,
  options?: { excludedOrderTypes?: OrderTypes[] }
): TransactionHash | null {
  const excludedOrderTypes = new Set(options?.excludedOrderTypes ?? []);
  const events = "result" in result && Array.isArray(result.result) ? result.result : [];

  return (
    events.find(
      (event) =>
        !isCancelStatus(event.order_status) &&
        !isErrorStatus(event.order_status) &&
        !excludedOrderTypes.has(event.order_type)
    ) ?? null
  );
}

export function hasFailedRequestEvent(
  result: TransactionHashQueryResult
): boolean {
  const events = "result" in result && Array.isArray(result.result) ? result.result : [];

  return events.some(
    (event) =>
      isCancelStatus(event.order_status) || isErrorStatus(event.order_status)
  );
}

export async function waitForRequestIdConfirmation(
  requestId: string,
  options?: {
    excludedOrderTypes?: OrderTypes[];
    retries?: number;
    delayMs?: number;
  }
): Promise<
  | { success: true; event: TransactionHash }
  | { success: false; cancelled?: boolean; message: string }
> {
  const retries = options?.retries ?? 30;
  const delayMs = options?.delayMs ?? 1000;
  const excludedOrderTypes = options?.excludedOrderTypes ?? [];

  let confirmedEvent: TransactionHash | null = null;

  const transactionHashRes = await retry<
    ReturnType<typeof queryTransactionHashByRequestId>,
    string
  >(
    queryTransactionHashByRequestId,
    retries,
    requestId,
    delayMs,
    (result) => {
      confirmedEvent = getConfirmedRequestEvent(result, {
        excludedOrderTypes,
      });
      return !!confirmedEvent;
    },
    hasFailedRequestEvent
  );

  if (!transactionHashRes.success) {
    return {
      success: false,
      cancelled: transactionHashRes.cancelled,
      message: transactionHashRes.cancelled
        ? "Request was cancelled before confirmation."
        : "Timed out waiting for request confirmation.",
    };
  }

  // Fallback: if the condition callback wasn't invoked (e.g. retry resolved
  // without calling it), extract the event from the response data directly.
  const event =
    confirmedEvent ??
    getConfirmedRequestEvent(transactionHashRes.data, { excludedOrderTypes });

  if (!event) {
    return {
      success: false,
      message: "Confirmed request event was missing from the response.",
    };
  }

  return {
    success: true,
    event,
  };
}
