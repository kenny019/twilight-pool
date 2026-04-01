import { executeLendOrder } from "@/lib/api/client";
import {
  queryTransactionHashByRequestId,
  queryTransactionHashes,
  type TransactionHash,
} from "@/lib/api/rest";
import { queryLendOrder } from "@/lib/api/relayer";
import { retry, safeJSONParse, isUserRejection } from "@/lib/helpers";
import { useSessionStore } from "@/lib/providers/session";
import useGetTwilightBTCBalance from "@/lib/hooks/useGetTwilightBtcBalance";
import { useTwilightStore, useTwilightStoreApi } from "@/lib/providers/store";
import {
  createQueryLendOrderMsg,
  executeTradeLendOrderMsg,
} from "@/lib/twilight/zkos";
import { createZkAccount, createZkBurnTx } from "@/lib/twilight/zk";
import { broadcastTradingTx } from "@/lib/api/zkos";
import { twilightproject } from "twilightjs";
import Long from "long";
import BTC from "@/lib/twilight/denoms";
import Link from "next/link";
import { ZkPrivateAccount } from "@/lib/zk/account";
import { assertCosmosTxSuccess } from "@/lib/utils/cosmosTx";
import { buildLendLedgerEntryFromRelayerEvent } from "@/lib/account-ledger/from-relayer";
import {
  buildBurnReadyFundingAccount,
  buildRecoverableLendAccount,
  buildStagedFundingAccount,
  completeLendWithdrawal,
  createFundingBurnHistoryEntry,
  createRelayerSettleHistoryEntry,
  createStagedTransferHistoryEntry,
  markLendWithdrawalPending,
} from "@/lib/utils/lendWithdrawalState";
import type {
  AccountLedgerEntry,
  LendOrder,
  QueryLendOrderData,
  TransactionHistory,
  ZkAccount,
} from "@/lib/types";
import { useWallet } from "@cosmos-kit/react-lite";
import Big from "big.js";
import React, {
  useCallback,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type ToastArgs = {
  variant?: "default" | "error" | "success";
  title: string;
  description?: ReactNode;
};

type ToastFn = (args: ToastArgs) => void;

type SignAndBroadcastClient = {
  signAndBroadcast: (...args: any[]) => Promise<unknown>;
};

type ChainWalletLike = {
  address?: string;
  getSigningStargateClient: () => Promise<SignAndBroadcastClient>;
};

type PrivateAccountLike = {
  privateTxSingle: (
    amount: number,
    address: string
  ) => Promise<
    | {
        success: true;
        data: {
          scalar: string;
          txId: string;
          updatedAddress: string;
        };
      }
    | {
        success: false;
        message: string;
      }
  >;
};

type LendWithdrawalOps = {
  retry: typeof retry;
  queryTransactionHashes: typeof queryTransactionHashes;
  executeTradeLendOrderMsg: typeof executeTradeLendOrderMsg;
  executeLendOrder: typeof executeLendOrder;
  queryTransactionHashByRequestId: typeof queryTransactionHashByRequestId;
  createQueryLendOrderMsg: typeof createQueryLendOrderMsg;
  queryLendOrder: typeof queryLendOrder;
  createZkAccount: typeof createZkAccount;
  createPrivateAccount: (params: {
    signature: string;
    existingAccount: ZkAccount;
  }) => Promise<PrivateAccountLike>;
  createZkBurnTx: typeof createZkBurnTx;
  broadcastTradingTx: typeof broadcastTradingTx;
  safeJSONParse: typeof safeJSONParse;
  assertCosmosTxSuccess: typeof assertCosmosTxSuccess;
  isUserRejection: typeof isUserRejection;
  buildMintBurnMsg: (params: {
    value: number;
    scalar: string;
    zkAccountHex: string;
    twilightAddress: string;
  }) => unknown;
};

type LendLedgerState = Parameters<typeof buildLendLedgerEntryFromRelayerEvent>[0];

const defaultOps: LendWithdrawalOps = {
  retry,
  queryTransactionHashes,
  executeTradeLendOrderMsg,
  executeLendOrder,
  queryTransactionHashByRequestId,
  createQueryLendOrderMsg,
  queryLendOrder,
  createZkAccount,
  createPrivateAccount: ({ signature, existingAccount }) =>
    ZkPrivateAccount.create({ signature, existingAccount }),
  createZkBurnTx,
  broadcastTradingTx,
  safeJSONParse,
  assertCosmosTxSuccess,
  isUserRejection,
  buildMintBurnMsg: ({ value, scalar, zkAccountHex, twilightAddress }) => {
    const { mintBurnTradingBtc } =
      twilightproject.nyks.zkos.MessageComposer.withTypeUrl;

    return mintBurnTradingBtc({
      btcValue: Long.fromNumber(value),
      encryptScalar: scalar,
      mintOrBurn: false,
      qqAccount: zkAccountHex,
      twilightAddress,
    });
  },
};

type UseLendWithdrawalParams = {
  isRelayerHalted?: boolean;
  getAccountTag: (address: string) => string;
  toast: ToastFn;
};

type LendWithdrawalControllerParams = {
  chainWallet?: ChainWalletLike;
  twilightAddress?: string;
  privateKey?: string;
  isRelayerHalted?: boolean;
  zKAccounts: ZkAccount[];
  getAccountTag: (address: string) => string;
  addLendHistory: (order: LendOrder) => void;
  updateZkAccount: (zkAddress: string, updatedZkAccount: ZkAccount) => void;
  removeZkAccount: (zkAccount: ZkAccount) => void;
  removeLend: (order: LendOrder) => void;
  updateLend: (uuid: string, updates: Partial<LendOrder>) => void;
  addTransactionHistory: (entry: TransactionHistory) => void;
  addAccountLedgerEntry: (entry: AccountLedgerEntry) => void;
  getLedgerState: () => LendLedgerState;
  twilightSats?: number | null;
  toast: ToastFn;
  setIsSettleLoading: (loading: boolean) => void;
  setSettlingOrderId: (id: string | null) => void;
  setIsWithdrawDialogOpen: (open: boolean) => void;
  ops?: Partial<LendWithdrawalOps>;
};

type RelayerSettlementResult = {
  requestId: string;
  txHash?: string;
  settledTx?: TransactionHash;
};

type FinalizedSettlementResult = {
  newBalance: number;
  payment: number;
};

type PreparedRecoverableAccount = {
  selectedZkAccount: ZkAccount;
  recoverableAccount: ZkAccount;
};

type StagedFundingReturn = {
  stagedAccount: ZkAccount;
  txId: string;
  stargateClient: SignAndBroadcastClient;
  transientAddress: string;
};

export function createLendWithdrawalController(
  params: LendWithdrawalControllerParams
) {
  const ops = {
    ...defaultOps,
    ...params.ops,
  };

  const resetWithdrawUi = () => {
    params.setIsSettleLoading(false);
    params.setSettlingOrderId(null);
  };

  const buildWithdrawLedgerEntry = (
    order: LendOrder,
    txHash: TransactionHash,
    amountSats: number,
    fallbackOrderId?: string | null
  ) =>
    buildLendLedgerEntryFromRelayerEvent(params.getLedgerState(), txHash, {
      accountAddress: order.accountAddress,
      accountTag: params.getAccountTag(order.accountAddress) || "Lend Account",
      amountSats,
      fundingAddress: params.twilightAddress as string,
      operation: "withdraw",
      fallbackOrderId: fallbackOrderId ?? order.uuid,
    });

  async function requestRelayerSettlement(
    order: LendOrder
  ): Promise<RelayerSettlementResult | null> {
    const lendOrderRes = await ops.retry<
      ReturnType<typeof queryTransactionHashes>,
      string
    >(ops.queryTransactionHashes, 30, order.accountAddress, 1000, (txHash) => {
      const found = txHash.result?.find((tx) => tx.order_status === "FILLED");
      return !!found;
    });

    if (!lendOrderRes.success) {
      console.error("lend order settle not successful");
      resetWithdrawUi();
      return null;
    }

    const lendOrderData = lendOrderRes.data.result.find(
      (tx) => tx.order_status === "FILLED"
    );

    if (!lendOrderData) {
      resetWithdrawUi();
      return null;
    }

    const msg = await ops.executeTradeLendOrderMsg({
      outputMemo: lendOrderData.output ?? "",
      signature: params.privateKey as string,
      address: lendOrderData.account_id,
      uuid: lendOrderData.order_id,
      orderStatus: lendOrderData.order_status,
      orderType: lendOrderData.order_type,
      transactionType: "LENDTX",
      executionPricePoolshare: 1,
    });

    const executeLendRes = await ops.executeLendOrder(msg);
    const requestId = executeLendRes.result.id_key;

    const requestIdRes = await ops.retry<
      ReturnType<typeof queryTransactionHashByRequestId>,
      string
    >(
      ops.queryTransactionHashByRequestId,
      30,
      requestId,
      1000,
      (txHash) => {
        const result = "result" in txHash ? txHash.result : undefined;
        const found = Array.isArray(result)
          ? result.find((tx: TransactionHash) => tx.order_status === "SETTLED")
          : undefined;
        return !!found;
      },
      (txHash) => {
        const result = "result" in txHash ? txHash.result : undefined;
        const cancelled = Array.isArray(result)
          ? result.find((tx: TransactionHash) => tx.order_status === "CANCELLED")
          : undefined;
        return !!cancelled;
      }
    );

    if (!requestIdRes.success) {
      const failedEvent: TransactionHash = {
        account_id: order.accountAddress,
        datetime: new Date().toISOString(),
        id: 0,
        order_id: order.uuid,
        order_status: requestIdRes.cancelled ? "CANCELLED" : "NoResponseFromChain",
        order_type: "LEND",
        output: null,
        reason: requestIdRes.cancelled
          ? "Lend withdraw request denied"
          : "Lend withdraw request timed out",
        old_price: null,
        new_price: null,
        request_id: requestId,
        tx_hash: "",
      };
      params.addAccountLedgerEntry(
        buildWithdrawLedgerEntry(order, failedEvent, order.value, order.uuid)
      );

      if (requestIdRes.cancelled) {
        params.toast({
          variant: "error",
          title: "Withdraw request denied",
          description: "The withdraw request was denied. Please try again later.",
        });
      } else {
        console.error("lend order settle not successful");
        params.toast({
          variant: "error",
          title: "Unable to withdraw lend order",
          description: "An error has occurred, try again later.",
        });
      }
      resetWithdrawUi();
      return null;
    }

    const txResult =
      "result" in requestIdRes.data ? requestIdRes.data.result : [];
    if (Array.isArray(txResult)) {
      txResult
        .filter((tx) => tx.order_status !== "SETTLED")
        .forEach((tx) => {
          params.addAccountLedgerEntry(
            buildWithdrawLedgerEntry(order, tx, order.value, requestId)
          );
        });
    }

    const settledTx = Array.isArray(txResult)
      ? txResult.find((tx: TransactionHash) => tx.order_status === "SETTLED")
      : undefined;

    return {
      requestId,
      txHash: settledTx?.tx_hash,
      settledTx,
    };
  }

  async function finalizeRelayerSettlement(
    order: LendOrder,
    settlement: RelayerSettlementResult
  ): Promise<FinalizedSettlementResult | null> {
    const normalizedOrder: LendOrder = {
      ...order,
      uuid: settlement.settledTx?.order_id || order.uuid,
      request_id:
        order.request_id || settlement.settledTx?.request_id || settlement.requestId,
    };

    params.updateLend(order.uuid, {
      ...markLendWithdrawalPending(order),
      request_id: normalizedOrder.request_id,
    });

    const queryLendOrderMsg = await ops.createQueryLendOrderMsg({
      address: order.accountAddress,
      signature: params.privateKey as string,
      orderStatus: "SETTLED",
    });

    const queryLendOrderRes = await ops.retry(
      ops.queryLendOrder,
      5,
      queryLendOrderMsg,
      1000,
      (res) => !!res?.result
    );

    if (!queryLendOrderRes.success || !queryLendOrderRes.data?.result) {
      if (settlement.settledTx) {
        params.addAccountLedgerEntry(
          buildWithdrawLedgerEntry(
            order,
            {
              ...settlement.settledTx,
              request_id:
                settlement.settledTx.request_id ?? normalizedOrder.request_id,
            },
            order.value,
            normalizedOrder.uuid
          )
        );

        params.addLendHistory(
          completeLendWithdrawal({
            order: normalizedOrder,
            txHash: settlement.settledTx.tx_hash,
            value: order.value,
            payment: 0,
          })
        );
        params.removeLend(order);
      } else {
        params.updateLend(order.uuid, { withdrawPending: false });
      }

      console.error("queryLendOrder", queryLendOrderRes);
      params.toast({
        variant: "error",
        title: "Unable to query lend order",
        description:
          "Your withdraw may have succeeded. Check your transaction history.",
      });
      resetWithdrawUi();
      return null;
    }

    const lendResult = queryLendOrderRes.data.result as QueryLendOrderData;
    const newBalance = Math.round(
      Big(lendResult.new_lend_state_amount ?? 0).toNumber()
    );
    const payment = Big(lendResult.payment ?? 0).toNumber() || 0;
    const settledAccountTag = params.getAccountTag(order.accountAddress) || "Account";

    if (settlement.settledTx) {
      params.addAccountLedgerEntry(
        buildWithdrawLedgerEntry(
          order,
          {
            ...settlement.settledTx,
            request_id: settlement.settledTx.request_id ?? normalizedOrder.request_id,
          },
          newBalance,
          normalizedOrder.uuid
        )
      );
    }

    params.addTransactionHistory(
      createRelayerSettleHistoryEntry({
        accountAddress: order.accountAddress,
        accountTag: settledAccountTag,
        txHash: settlement.txHash,
        value: newBalance,
        fundingSatsSnapshot: params.twilightSats,
      })
    );

    params.addLendHistory(
      completeLendWithdrawal({
        order: normalizedOrder,
        txHash: settlement.txHash,
        value: newBalance,
        payment,
      })
    );

    params.removeLend(order);
    resetWithdrawUi();

    return {
      newBalance,
      payment,
    };
  }

  async function prepareRecoverableAccount(
    order: LendOrder,
    settlement: FinalizedSettlementResult
  ): Promise<PreparedRecoverableAccount | null> {
    const selectedZkAccount = params.zKAccounts.find(
      (account) => account.address === order.accountAddress
    );

    if (!selectedZkAccount) {
      console.error("selectedZkAccount not found");
      params.toast({
        variant: "error",
        title: "Withdrawal settled",
        description:
          "Your lend was settled, but the recovery account could not be loaded locally. Refresh and check Active Accounts.",
      });
      return null;
    }

    const recoverableAccount = buildRecoverableLendAccount({
      account: selectedZkAccount,
      value: settlement.newBalance,
    });

    params.updateZkAccount(selectedZkAccount.address, recoverableAccount);

    return {
      selectedZkAccount,
      recoverableAccount,
    };
  }

  async function stageFundingReturn(
    selectedZkAccount: ZkAccount,
    recoverableAccount: ZkAccount,
    amount: number
  ): Promise<StagedFundingReturn | null> {
    params.setIsWithdrawDialogOpen(true);

    const stargateClient = await params.chainWallet!.getSigningStargateClient();
    const transientAccount = await ops.createZkAccount({
      tag: Math.random().toString(36).substring(2, 15),
      signature: params.privateKey as string,
    });

    const senderZkPrivateAccount = await ops.createPrivateAccount({
      signature: params.privateKey as string,
      existingAccount: recoverableAccount,
    });

    const privateTxSingleResult = await senderZkPrivateAccount.privateTxSingle(
      amount,
      transientAccount.address
    );

    if (!privateTxSingleResult.success) {
      console.error(privateTxSingleResult.message);
      params.setIsWithdrawDialogOpen(false);
      return null;
    }

    const { scalar: updatedTransientScalar, txId, updatedAddress } =
      privateTxSingleResult.data;

    const stagedAccount = buildStagedFundingAccount({
      account: recoverableAccount,
      updatedAddress,
      updatedScalar: updatedTransientScalar,
      value: amount,
    });

    params.updateZkAccount(recoverableAccount.address, stagedAccount);
    params.addTransactionHistory(
      createStagedTransferHistoryEntry({
        fromAddress: selectedZkAccount.address,
        fromTag: selectedZkAccount.tag,
        toAddress: updatedAddress,
        toTag: recoverableAccount.tag,
        txId,
        value: amount,
        fromType: "CoinSettled",
        toType: "Coin",
        fundingSatsSnapshot: params.twilightSats,
      })
    );

    return {
      stagedAccount,
      txId,
      stargateClient,
      transientAddress: transientAccount.address,
    };
  }

  async function completeFundingBurn(paramsForBurn: {
    selectedZkAccount: ZkAccount;
    stagedAccount: ZkAccount;
    stargateClient: SignAndBroadcastClient;
    transientAddress: string;
    amount: number;
  }): Promise<boolean> {
    const { success, msg: zkBurnMsg, zkAccountHex } = await ops.createZkBurnTx({
      signature: params.privateKey as string,
      zkAccount: {
        tag: paramsForBurn.selectedZkAccount.tag,
        address: paramsForBurn.stagedAccount.address,
        scalar: paramsForBurn.stagedAccount.scalar,
        isOnChain: true,
        value: paramsForBurn.amount,
        type: "Coin",
      },
      initZkAccountAddress: paramsForBurn.transientAddress,
    });

    if (!success || !zkBurnMsg || !zkAccountHex) {
      console.error("error creating zkBurnTx msg");
      console.error({ success, zkBurnMsg, zkAccountHex });
      params.setIsWithdrawDialogOpen(false);
      return false;
    }

    const burnReadyAccount = buildBurnReadyFundingAccount({
      account: paramsForBurn.stagedAccount,
      zkAccountHex,
    });

    params.updateZkAccount(paramsForBurn.stagedAccount.address, burnReadyAccount);

    params.toast({
      title: "Broadcasting transfer",
      description:
        "Please do not close this page while your transfer is being submitted...",
    });

    const tradingTxResString = await ops.broadcastTradingTx(
      zkBurnMsg,
      params.twilightAddress as string
    );

    const tradingTxRes = ops.safeJSONParse(tradingTxResString as string);

    if (!tradingTxRes.success || Object.hasOwn(tradingTxRes, "error")) {
      console.error("error broadcasting zkBurnTx msg", tradingTxRes);
      params.setIsWithdrawDialogOpen(false);
      return false;
    }

    const mintBurnMsg = ops.buildMintBurnMsg({
      value: paramsForBurn.amount,
      scalar: burnReadyAccount.scalar,
      zkAccountHex,
      twilightAddress: params.twilightAddress as string,
    });

    params.toast({
      title: "Approval Pending",
      description: "Please approve the transaction in your wallet.",
    });

    const mintBurnRes = ops.assertCosmosTxSuccess(
      await paramsForBurn.stargateClient.signAndBroadcast(
        params.twilightAddress as string,
        [mintBurnMsg],
        "auto"
      ),
      "Lend withdrawal funding burn"
    );

    params.addTransactionHistory(
      createFundingBurnHistoryEntry({
        fromAddress: burnReadyAccount.address,
        fromTag: paramsForBurn.selectedZkAccount.tag,
        twilightAddress: params.twilightAddress as string,
        txHash: mintBurnRes.transactionHash,
        value: paramsForBurn.amount,
        fundingSatsSnapshot: params.twilightSats,
      })
    );

    params.toast({
      title: "Success",
      description: React.createElement(
        "div",
        { className: "opacity-90" },
        `Successfully sent ${new BTC("sats", Big(paramsForBurn.amount))
          .convert("BTC")
          .toString()} BTC to the Funding Account.`,
        React.createElement(
          Link,
          {
            href: `${
              process.env.NEXT_PUBLIC_EXPLORER_URL as string
            }/txs/${mintBurnRes.transactionHash}`,
            target: "_blank",
            className: "text-sm underline hover:opacity-100",
          },
          "Explorer link"
        )
      ),
    });

    params.setIsWithdrawDialogOpen(false);
    params.removeZkAccount(burnReadyAccount);

    return true;
  }

  async function settleLendOrder(order: LendOrder) {
    try {
      if (!params.chainWallet || !params.twilightAddress || !params.privateKey) {
        console.error("chainWallet not found");
        return;
      }

      if (params.isRelayerHalted) {
        params.toast({
          variant: "error",
          title: "Withdrawals paused",
          description:
            "The relayer is currently halted. Withdrawals will be available when the relayer resumes.",
        });
        return;
      }

      params.toast({
        title: "Withdrawing lend order",
        description:
          "Please do not close this page until the lend order is withdrawn...",
      });

      params.setIsSettleLoading(true);
      params.setSettlingOrderId(order.accountAddress);

      const relayerSettlement = await requestRelayerSettlement(order);
      if (!relayerSettlement) {
        return;
      }

      const finalizedSettlement = await finalizeRelayerSettlement(
        order,
        relayerSettlement
      );
      if (!finalizedSettlement) {
        return;
      }

      const preparedRecoverableAccount = await prepareRecoverableAccount(
        order,
        finalizedSettlement
      );
      if (!preparedRecoverableAccount) {
        return;
      }

      const stagedFundingReturn = await stageFundingReturn(
        preparedRecoverableAccount.selectedZkAccount,
        preparedRecoverableAccount.recoverableAccount,
        finalizedSettlement.newBalance
      );
      if (!stagedFundingReturn) {
        return;
      }

      await completeFundingBurn({
        selectedZkAccount: preparedRecoverableAccount.selectedZkAccount,
        stagedAccount: stagedFundingReturn.stagedAccount,
        stargateClient: stagedFundingReturn.stargateClient,
        transientAddress: stagedFundingReturn.transientAddress,
        amount: finalizedSettlement.newBalance,
      });
    } catch (err) {
      resetWithdrawUi();
      params.setIsWithdrawDialogOpen(false);
      params.updateLend(order.uuid, { withdrawPending: false });
      if (ops.isUserRejection(err)) {
        params.toast({
          title: "Transaction rejected",
          description: "You declined the transaction in your wallet.",
        });
        return;
      }
      console.error(err);
      params.toast({
        variant: "error",
        title: "Error",
        description:
          "An error has occurred withdrawing lend order, try again later.",
      });
    }
  }

  return {
    settleLendOrder,
  };
}

export function useLendWithdrawal(params: UseLendWithdrawalParams) {
  const [isSettleLoading, setIsSettleLoading] = useState(false);
  const [settlingOrderId, setSettlingOrderId] = useState<string | null>(null);
  const [isWithdrawDialogOpen, setIsWithdrawDialogOpen] = useState(false);

  const privateKey = useSessionStore((state) => state.privateKey);
  const { twilightSats } = useGetTwilightBTCBalance();
  const zKAccounts = useTwilightStore((state) => state.zk.zkAccounts);
  const updateZkAccount = useTwilightStore((state) => state.zk.updateZkAccount);
  const removeZkAccount = useTwilightStore((state) => state.zk.removeZkAccount);
  const removeLend = useTwilightStore((state) => state.lend.removeLend);
  const updateLend = useTwilightStore((state) => state.lend.updateLend);
  const addLendHistory = useTwilightStore((state) => state.lend.addLendHistory);
  const addTransactionHistory = useTwilightStore(
    (state) => state.history.addTransaction
  );
  const addAccountLedgerEntry = useTwilightStore(
    (state) => state.account_ledger.addEntry
  );
  const storeApi = useTwilightStoreApi();

  const { mainWallet } = useWallet();
  const chainWallet = mainWallet?.getChainWallet("nyks");
  const twilightAddress = chainWallet?.address;

  const controller = useMemo(
    () =>
      createLendWithdrawalController({
        chainWallet,
        twilightAddress,
        privateKey,
        isRelayerHalted: params.isRelayerHalted,
        zKAccounts,
        getAccountTag: params.getAccountTag,
        addLendHistory,
        updateZkAccount,
        removeZkAccount,
        removeLend,
        updateLend,
        addTransactionHistory,
        addAccountLedgerEntry,
        getLedgerState: storeApi.getState,
        twilightSats,
        toast: params.toast,
        setIsSettleLoading,
        setSettlingOrderId,
        setIsWithdrawDialogOpen,
      }),
    [
      addLendHistory,
      addAccountLedgerEntry,
      addTransactionHistory,
      chainWallet,
      params.getAccountTag,
      params.isRelayerHalted,
      params.toast,
      privateKey,
      removeLend,
      removeZkAccount,
      storeApi,
      twilightSats,
      twilightAddress,
      updateLend,
      updateZkAccount,
      zKAccounts,
    ]
  );

  const settleLendOrder = useCallback(
    (order: LendOrder) => controller.settleLendOrder(order),
    [controller]
  );

  return {
    settleLendOrder,
    isSettleLoading,
    settlingOrderId,
    isWithdrawDialogOpen,
    setIsWithdrawDialogOpen,
  };
}
