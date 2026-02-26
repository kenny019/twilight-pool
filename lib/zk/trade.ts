import { TradeOrder } from "@/lib/types";
import { queryTransactionHashes } from "../api/rest";
import { retry } from "../helpers";
import {
  createQueryTradeOrderMsg,
  executeTradeLendOrderMsg,
} from "../twilight/zkos";
import { executeTradeOrder } from "@/lib/api/client";
import {
  cancelTradeOrder,
  queryTradeOrder,
  QueryTradeOrderData,
} from "../api/relayer";

type SuccessResult<T> = {
  success: true;
  data: T;
};

type FailureResult = {
  success: false;
  message: string;
};

export async function settleOrder(
  trade: TradeOrder,
  type: "market" | "limit",
  privateKey: string,
  price: number
): Promise<
  SuccessResult<QueryTradeOrderData & { tx_hash?: string }> | FailureResult
> {
  try {
    if (trade.orderStatus !== "FILLED") {
      return {
        success: false,
        message: "Only filled orders can be settled",
      };
    }

    let output = trade.output;

    if (!output) {
      const transactionHashCondition = (
        txHashResult: Awaited<ReturnType<typeof queryTransactionHashes>>
      ) => {
        if (txHashResult.result) {
          const transactionHashes = txHashResult.result;

          let hasSettled = false;

          transactionHashes.forEach((result) => {
            if (!result.output) {
              return;
            }

            hasSettled = result.order_id === trade.uuid;
          });

          return hasSettled;
        }
        return false;
      };

      const transactionHashRes = await retry<
        ReturnType<typeof queryTransactionHashes>,
        string
      >(
        queryTransactionHashes,
        30,
        trade.accountAddress,
        1000,
        transactionHashCondition
      );

      if (!transactionHashRes.success) {
        console.error("failed to get output for the trade", transactionHashRes);
        return {
          success: false,
          message:
            "Failed to get output for the trade, please check the console for more details",
        };
      }

      const transactionHashResult = transactionHashRes.data;

      output = transactionHashResult.result.find(
        (result) => result.order_id === trade.uuid && result.output
      )?.output;

      if (typeof output !== "string") {
        console.log(transactionHashResult);
        return {
          success: false,
          message:
            "Failed to get output for the trade, please check the console for more details",
        };
      }
    }

    console.log(`inputs for settleOrderMsg`, {
      address: trade.accountAddress,
      orderStatus: "FILLED",
      orderType: type.toUpperCase(),
      outputMemo: output,
      transactionType: "ORDERTX",
      uuid: trade.uuid,
      signature: privateKey,
      executionPricePoolshare: price,
    });

    const msg = await executeTradeLendOrderMsg({
      address: trade.accountAddress,
      orderStatus: "FILLED",
      orderType: type.toUpperCase(),
      outputMemo: output,
      transactionType: "ORDERTX",
      uuid: trade.uuid,
      signature: privateKey,
      executionPricePoolshare: price,
    });

    console.log(`msg`, msg);

    const executeTradeOrderResponse = await executeTradeOrder(msg);
    console.log("executeTradeResponse", executeTradeOrderResponse);

    let txHash: string | undefined;

    if (type === "market") {
      const transactionHashCondition = (
        txHashResult: Awaited<ReturnType<typeof queryTransactionHashes>>
      ) => {
        if (txHashResult.result) {
          const found = txHashResult.result.find(
            (r) =>
              r.order_status === "SETTLED" &&
              r.order_id === trade.uuid &&
              r.tx_hash &&
              !r.tx_hash.includes("Error")
          );
          return !!found;
        }
        return false;
      };

      const transactionHashFailCondition = (
        txHashResult: Awaited<ReturnType<typeof queryTransactionHashes>>
      ) => {
        return (
          txHashResult.result?.some(
            (r) => r.order_id === trade.uuid && r.order_status === "CANCELLED"
          ) ?? false
        );
      };

      const transactionHashRes = await retry<
        ReturnType<typeof queryTransactionHashes>,
        string
      >(
        queryTransactionHashes,
        30,
        trade.accountAddress,
        1000,
        transactionHashCondition,
        transactionHashFailCondition
      );

      if (!transactionHashRes.success) {
        if (transactionHashRes.cancelled) {
          return {
            success: false,
            message:
              "Settle request was not honored. Please resend the request.",
          };
        }
        console.error(
          "settling MARKET order failed to get transaction_hashes",
          transactionHashRes
        );
        return {
          success: false,
          message:
            "Failed to confirm order has been settled onchain, please check the console for more details",
        };
      }

      const settledTx = transactionHashRes.data.result.find(
        (tx) => tx.order_status === "SETTLED" && tx.order_id === trade.uuid
      );

      if (!settledTx) {
        console.error(
          "failed to find settled tx",
          transactionHashRes.data.result
        );
        return {
          success: false,
          message:
            "Failed to confirm order has been settled onchain, please check the console for more details",
        };
      }

      txHash = settledTx.tx_hash;
    }

    const queryTradeOrderMsg = await createQueryTradeOrderMsg({
      address: trade.accountAddress,
      orderStatus: type === "market" ? "SETTLED" : "FILLED",
      signature: privateKey,
    });

    const queryTradeOrderResponse = await queryTradeOrder(queryTradeOrderMsg);

    if (!queryTradeOrderResponse || !queryTradeOrderResponse.result) {
      console.error("failed to query trade order", queryTradeOrderResponse);
      return {
        success: false,
        message:
          "Failed to query trade order details, please check the console for more details",
      };
    }

    const queryTradeOrderData = queryTradeOrderResponse.result;

    return {
      success: true,
      data: {
        ...queryTradeOrderData,
        tx_hash: txHash || undefined,
      },
    };
  } catch (err) {
    // unhandled error lets give a generic error message
    console.error(`settleOrder error:`, err);
    return {
      success: false,
      message: `Failed to settle order with type ${type}, please check the console for more details.`,
    };
  }
}

export async function cancelZkOrder(
  trade: TradeOrder,
  privateKey: string
): Promise<
  SuccessResult<QueryTradeOrderData & { tx_hash: string }> | FailureResult
> {
  try {
    const cancelResult = await cancelTradeOrder({
      address: trade.accountAddress,
      uuid: trade.uuid,
      signature: privateKey,
    });

    console.log("cancelResult", cancelResult);

    if (
      typeof cancelResult.result === "string" &&
      cancelResult.result.includes("not cancelable")
    ) {
      return {
        success: false,
        message: "You cannot cancel this order",
      };
    }

    const transactionHashCondition = (
      txHashResult: Awaited<ReturnType<typeof queryTransactionHashes>>
    ) => {
      if (txHashResult.result) {
        const transactionHashes = txHashResult.result;

        let hasSettled = false;
        transactionHashes.forEach((result) => {
          if (result.order_status !== "CANCELLED") {
            console.log(result.order_status);
            return;
          }

          hasSettled =
            result.order_id === trade.uuid && !result.tx_hash.includes("Error");
        });

        return hasSettled;
      }
      return false;
    };

    const transactionHashRes = await retry<
      ReturnType<typeof queryTransactionHashes>,
      string
    >(
      queryTransactionHashes,
      30,
      trade.accountAddress,
      1000,
      transactionHashCondition
    );

    if (!transactionHashRes.success) {
      console.error("cancel order failed to get transaction_hashes");
      return {
        success: false,
        message: "Error with cancelling trade order",
      };
    }

    const queryTradeOrderMsg = await createQueryTradeOrderMsg({
      address: trade.accountAddress,
      orderStatus: "CANCELLED",
      signature: privateKey,
    });

    const queryTradeOrderResponse = await queryTradeOrder(queryTradeOrderMsg);

    if (!queryTradeOrderResponse || !queryTradeOrderResponse.result) {
      console.error("failed to query trade order", queryTradeOrderResponse);
      return {
        success: false,
        message:
          "Failed to query trade order details, please check the console for more details",
      };
    }

    const queryTradeOrderData = queryTradeOrderResponse.result;

    console.log(transactionHashRes.data.result);

    return {
      success: true,
      data: {
        ...queryTradeOrderData,
        tx_hash: transactionHashRes.data.result[0].tx_hash,
      },
    };
  } catch (err) {
    console.error(`cancelOrder error:`, err);
    return {
      success: false,
      message: `Failed to cancel order, please check the console for more details.`,
    };
  }
}
