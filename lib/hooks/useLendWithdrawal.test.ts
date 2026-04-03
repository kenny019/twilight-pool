import { beforeEach, describe, expect, it, vi } from "vitest";
import type { LendOrder, ZkAccount } from "@/lib/types";
import { createLendWithdrawalController } from "./useLendWithdrawal";

vi.mock("@/lib/providers/session", () => ({
  useSessionStore: vi.fn(),
}));

vi.mock("@/lib/providers/store", () => ({
  useTwilightStore: vi.fn(),
}));

vi.mock("@cosmos-kit/react-lite", () => ({
  useWallet: vi.fn(),
}));

vi.mock("next/link", () => ({
  default: "a",
}));

function makeOrder(overrides: Partial<LendOrder> = {}): LendOrder {
  return {
    accountAddress: "zk-1",
    value: 500,
    uuid: "lend-1",
    orderStatus: "LENDED",
    timestamp: new Date("2026-01-01T00:00:00Z"),
    tx_hash: "old-hash",
    ...overrides,
  };
}

function makeAccount(overrides: Partial<ZkAccount> = {}): ZkAccount {
  return {
    tag: "BTC lend 1",
    address: "zk-1",
    scalar: "scalar-1",
    type: "Coin",
    isOnChain: true,
    value: 500,
    createdAt: 123,
    ...overrides,
  };
}

function createHarness(options?: {
  zKAccounts?: ZkAccount[];
  requestIdResult?: { success: boolean; cancelled?: boolean; data?: unknown };
  queryLendOrderResult?: { success: boolean; data?: unknown };
  privateTxSingleResult?: {
    success: boolean;
    message?: string;
    data?: { scalar: string; txId: string; updatedAddress: string };
  };
  createZkBurnTxResult?: {
    success: boolean;
    msg?: string;
    zkAccountHex?: string;
  };
  broadcastTradingTxResult?: string;
  signAndBroadcastImpl?: () => Promise<unknown>;
  isUserRejection?: (err: unknown) => boolean;
}) {
  const order = makeOrder();
  const account = makeAccount();
  const uiState = {
    isSettleLoading: false,
    settlingOrderId: null as string | null,
    isWithdrawDialogOpen: false,
  };
  const toasts: Array<{ title: string; description?: unknown; variant?: string }> = [];
  const addLendHistory = vi.fn();
  const updateZkAccount = vi.fn();
  const removeZkAccount = vi.fn();
  const removeLend = vi.fn();
  const updateLend = vi.fn();
  const addTransactionHistory = vi.fn();
  const addAccountLedgerEntry = vi.fn();
  const signAndBroadcast = vi.fn(
    options?.signAndBroadcastImpl ??
      (() => Promise.resolve({ transactionHash: "burn-chain-tx" }))
  );
  const stargateClient = {
    signAndBroadcast,
  };
  const chainWallet = {
    address: "twilight-1",
    getSigningStargateClient: vi.fn().mockResolvedValue(stargateClient),
  };

  const ops = {
    retry: vi.fn(async (fn: (arg: unknown) => unknown, _attempts: number, firstArg: unknown) =>
      fn(firstArg)
    ),
    queryTransactionHashes: vi.fn().mockResolvedValue({
      success: true,
      data: {
        result: [
          {
            account_id: order.accountAddress,
            order_id: "order-1",
            order_status: "FILLED",
            order_type: "LEND",
            output: "output-memo",
          },
        ],
      },
    }),
    executeTradeLendOrderMsg: vi.fn().mockResolvedValue("execute-lend-msg"),
    executeLendOrder: vi.fn().mockResolvedValue({
      result: { id_key: "request-1" },
    }),
    queryTransactionHashByRequestId: vi.fn().mockResolvedValue(
      options?.requestIdResult ?? {
        success: true,
        data: {
          result: [
            {
              order_status: "SETTLED",
              tx_hash: "relayer-settle-tx",
            },
          ],
        },
      }
    ),
    createQueryLendOrderMsg: vi.fn().mockResolvedValue("query-lend-order-msg"),
    queryLendOrder: vi.fn().mockResolvedValue(
      options?.queryLendOrderResult ?? {
        success: true,
        data: {
          result: {
            new_lend_state_amount: "1500",
            payment: "125",
          },
        },
      }
    ),
    createZkAccount: vi.fn().mockResolvedValue({
      address: "transient-1",
    }),
    createPrivateAccount: vi.fn().mockResolvedValue({
      privateTxSingle: vi.fn().mockResolvedValue(
        options?.privateTxSingleResult ?? {
          success: true,
          data: {
            scalar: "scalar-2",
            txId: "transfer-tx",
            updatedAddress: "zk-2",
          },
        }
      ),
    }),
    createZkBurnTx: vi.fn().mockResolvedValue(
      options?.createZkBurnTxResult ?? {
        success: true,
        msg: "burn-msg",
        zkAccountHex: "hex-1",
      }
    ),
    broadcastTradingTx: vi
      .fn()
      .mockResolvedValue(options?.broadcastTradingTxResult ?? '{"success":true}'),
    safeJSONParse: vi.fn((value: string) => JSON.parse(value)),
    assertCosmosTxSuccess: vi.fn((tx: { transactionHash: string }) => tx),
    isUserRejection: vi.fn(options?.isUserRejection ?? (() => false)),
    buildMintBurnMsg: vi.fn().mockReturnValue({ type: "mint-burn" }),
  };

  const controller = createLendWithdrawalController({
    chainWallet,
    twilightAddress: "twilight-1",
    privateKey: "private-key",
    isRelayerHalted: false,
    zKAccounts: options?.zKAccounts ?? [account],
    getAccountTag: vi.fn(() => "BTC lend 1"),
    addLendHistory,
    updateZkAccount,
    removeZkAccount,
    removeLend,
    updateLend,
    addTransactionHistory,
    addAccountLedgerEntry,
    getLedgerState: () => ({
      zk: { zkAccounts: options?.zKAccounts ?? [account] },
      trade: { trades: [] },
      lend: { lends: [order] },
      account_ledger: { entries: [] },
    }),
    twilightSats: 25_000,
    toast: (toast) => {
      toasts.push(toast);
    },
    setIsSettleLoading: (loading) => {
      uiState.isSettleLoading = loading;
    },
    setSettlingOrderId: (id) => {
      uiState.settlingOrderId = id;
    },
    setIsWithdrawDialogOpen: (open) => {
      uiState.isWithdrawDialogOpen = open;
    },
    ops,
  });

  return {
    order,
    account,
    uiState,
    toasts,
    ops,
    controller,
    addLendHistory,
    updateZkAccount,
    removeZkAccount,
    removeLend,
    updateLend,
    addTransactionHistory,
    addAccountLedgerEntry,
    signAndBroadcast,
  };
}

describe("useLendWithdrawal controller", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("relayer rejection leaves the lend unchanged and shows an error", async () => {
    const harness = createHarness({
      requestIdResult: {
        success: false,
        cancelled: true,
      },
    });

    await harness.controller.settleLendOrder(harness.order);

    expect(harness.removeLend).not.toHaveBeenCalled();
    expect(harness.addLendHistory).not.toHaveBeenCalled();
    expect(harness.updateZkAccount).not.toHaveBeenCalled();
    expect(harness.toasts.at(-1)?.title).toBe("Withdraw request denied");
    expect(harness.uiState.isSettleLoading).toBe(false);
    expect(harness.uiState.settlingOrderId).toBeNull();
  });

  it("relayer settlement success closes the active lend and writes settled history immediately", async () => {
    const harness = createHarness({
      zKAccounts: [],
    });

    await harness.controller.settleLendOrder(harness.order);

    expect(harness.removeLend).toHaveBeenCalledWith(harness.order);
    expect(harness.addLendHistory).toHaveBeenCalledTimes(1);
    expect(harness.addTransactionHistory).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "Withdraw Lend",
        tx_hash: "relayer-settle-tx",
        value: 1500,
      })
    );
    expect(harness.toasts.at(-1)?.title).toBe("Withdrawal settled");
  });

  it("clears pending state when the settled lend details cannot be queried", async () => {
    const harness = createHarness({
      queryLendOrderResult: {
        success: false,
      },
    });

    await harness.controller.settleLendOrder(harness.order);

    expect(harness.removeLend).not.toHaveBeenCalled();
    expect(harness.updateLend).toHaveBeenNthCalledWith(
      1,
      harness.order.uuid,
      expect.objectContaining({ withdrawPending: true })
    );
    expect(harness.updateLend).toHaveBeenNthCalledWith(2, harness.order.uuid, {
      withdrawPending: false,
    });
    expect(harness.uiState.isSettleLoading).toBe(false);
    expect(harness.uiState.settlingOrderId).toBeNull();
  });

  it("keeps the lend closed and leaves a recoverable account when private transfer staging fails", async () => {
    const harness = createHarness({
      privateTxSingleResult: {
        success: false,
        message: "staging failed",
      },
    });

    await harness.controller.settleLendOrder(harness.order);

    expect(harness.removeLend).toHaveBeenCalledWith(harness.order);
    expect(harness.addLendHistory).toHaveBeenCalledTimes(1);
    expect(harness.updateZkAccount).toHaveBeenCalledWith(
      harness.account.address,
      expect.objectContaining({
        type: "CoinSettled",
        value: 1500,
      })
    );
    expect(harness.removeZkAccount).not.toHaveBeenCalled();
    expect(harness.uiState.isWithdrawDialogOpen).toBe(false);
  });

  it("keeps the lend closed and leaves a recoverable account when burn message creation fails", async () => {
    const harness = createHarness({
      createZkBurnTxResult: {
        success: false,
      },
    });

    await harness.controller.settleLendOrder(harness.order);

    expect(harness.removeLend).toHaveBeenCalledWith(harness.order);
    expect(harness.updateZkAccount).toHaveBeenNthCalledWith(
      2,
      "zk-1",
      expect.objectContaining({
        address: "zk-2",
        scalar: "scalar-2",
        type: "Coin",
      })
    );
    expect(harness.addTransactionHistory).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "Transfer",
        tx_hash: "transfer-tx",
      })
    );
    expect(harness.removeZkAccount).not.toHaveBeenCalled();
    expect(harness.uiState.isWithdrawDialogOpen).toBe(false);
  });

  it("keeps the lend closed and leaves a recoverable account when trading tx broadcast fails", async () => {
    const harness = createHarness({
      broadcastTradingTxResult: '{"success":false,"error":"broadcast failed"}',
    });

    await harness.controller.settleLendOrder(harness.order);

    expect(harness.removeLend).toHaveBeenCalledWith(harness.order);
    expect(harness.removeZkAccount).not.toHaveBeenCalled();
    expect(harness.addTransactionHistory).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: "Burn" })
    );
    expect(harness.uiState.isWithdrawDialogOpen).toBe(false);
  });

  it("keeps the lend closed and preserves the recoverable account when the user rejects the wallet signature", async () => {
    const rejectionError = new Error("rejected");
    const harness = createHarness({
      signAndBroadcastImpl: () => Promise.reject(rejectionError),
      isUserRejection: (err) => err === rejectionError,
    });

    await harness.controller.settleLendOrder(harness.order);

    expect(harness.removeLend).toHaveBeenCalledWith(harness.order);
    expect(harness.removeZkAccount).not.toHaveBeenCalled();
    expect(harness.toasts.at(-1)?.title).toBe("Transaction rejected");
    expect(harness.uiState.isWithdrawDialogOpen).toBe(false);
  });

  it("writes settle, transfer, and burn history and removes the transient account on full success", async () => {
    const harness = createHarness();

    await harness.controller.settleLendOrder(harness.order);

    expect(harness.removeLend).toHaveBeenCalledWith(harness.order);
    expect(harness.addTransactionHistory).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        type: "Withdraw Lend",
        tx_hash: "relayer-settle-tx",
      })
    );
    expect(harness.addTransactionHistory).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        type: "Transfer",
        tx_hash: "transfer-tx",
      })
    );
    expect(harness.addTransactionHistory).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        type: "Burn",
        tx_hash: "burn-chain-tx",
      })
    );
    expect(harness.removeZkAccount).toHaveBeenCalledWith(
      expect.objectContaining({
        address: "zk-2",
        zkAccountHex: "hex-1",
      })
    );
  });
});
