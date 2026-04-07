// TODO: verify response shapes against real indexer

export type IndexerDeposit = {
  id: string;
  btcDepositAddress: string;
  twilightAddress: string;
  amount: number;
  confirmed: boolean;
  blockHeight: number;
  createdAt: string;
  txHash: string;
};

export type IndexerWithdrawal = {
  id: string;
  withdrawAddress: string;
  twilightAddress: string;
  amount: number;
  reserveId: number;
  confirmed: boolean;
  blockHeight: number;
  createdAt: string;
  txHash: string;
};

export type IndexerAccount = {
  address: string;
  balances: { denom: string; amount: string }[];
  deposits: IndexerDeposit[];
  withdrawals: IndexerWithdrawal[];
};

export type IndexerPagination = {
  total: number;
  page: number;
  limit: number;
  pages: number;
};

export type BridgeAnalytics = {
  totalDeposits: number;
  totalWithdrawals: number;
  depositVolumeSats: number;
  withdrawalVolumeSats: number;
  avgDepositSats: number;
  avgWithdrawalSats: number;
};

export type DepositParams = {
  address?: string;
  reserveAddress?: string;
  search?: string;
  page?: number;
  limit?: number;
};

export type WithdrawalParams = {
  confirmed?: boolean;
  address?: string;
  withdrawAddress?: string;
  search?: string;
  page?: number;
  limit?: number;
};

const IS_MOCK = process.env.NEXT_PUBLIC_MOCK_MODE === "true";
const BASE_URL = process.env.NEXT_PUBLIC_INDEXER_BASE_URL ?? "";

type PaginatedResponse<T> = { data: T[]; pagination: IndexerPagination };

export async function getIndexerDeposits(
  params?: DepositParams
): Promise<PaginatedResponse<IndexerDeposit>> {
  if (IS_MOCK) {
    const { getMockState } = await import("../mock/state");
    const deposits = getMockState().indexerDeposits;
    return {
      data: deposits,
      pagination: { total: deposits.length, page: 1, limit: 20, pages: 1 },
    };
  }

  const url = new URL(`${BASE_URL}/twilight/deposits`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined) url.searchParams.set(k, String(v));
    });
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch indexer deposits");
  return res.json();
}

export async function getIndexerDeposit(id: string): Promise<IndexerDeposit> {
  if (IS_MOCK) {
    const { getMockState } = await import("../mock/state");
    const dep = getMockState().indexerDeposits.find((d) => d.id === id);
    if (!dep) throw new Error(`Deposit ${id} not found`);
    return dep;
  }

  const res = await fetch(`${BASE_URL}/twilight/deposits/${id}`);
  if (!res.ok) throw new Error(`Failed to fetch deposit ${id}`);
  return res.json();
}

export async function getIndexerWithdrawals(
  params?: WithdrawalParams
): Promise<PaginatedResponse<IndexerWithdrawal>> {
  if (IS_MOCK) {
    const { getMockState } = await import("../mock/state");
    const withdrawals = getMockState().indexerWithdrawals;
    return {
      data: withdrawals,
      pagination: {
        total: withdrawals.length,
        page: 1,
        limit: 20,
        pages: 1,
      },
    };
  }

  const url = new URL(`${BASE_URL}/twilight/withdrawals`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined) url.searchParams.set(k, String(v));
    });
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch indexer withdrawals");
  return res.json();
}

export async function getIndexerWithdrawal(
  id: string
): Promise<IndexerWithdrawal> {
  if (IS_MOCK) {
    const { getMockState } = await import("../mock/state");
    const wdr = getMockState().indexerWithdrawals.find((w) => w.id === id);
    if (!wdr) throw new Error(`Withdrawal ${id} not found`);
    return wdr;
  }

  const res = await fetch(`${BASE_URL}/twilight/withdrawals/${id}`);
  if (!res.ok) throw new Error(`Failed to fetch withdrawal ${id}`);
  return res.json();
}

export async function getIndexerAccount(
  address: string
): Promise<IndexerAccount> {
  if (IS_MOCK) {
    const { MOCK_ACCOUNT_DATA } = await import("../mock/constants");
    return MOCK_ACCOUNT_DATA;
  }

  const res = await fetch(`${BASE_URL}/accounts/${address}`);
  if (!res.ok) throw new Error(`Failed to fetch account ${address}`);
  return res.json();
}

export async function getIndexerBridgeAnalytics(): Promise<BridgeAnalytics> {
  if (IS_MOCK) {
    const { MOCK_BRIDGE_ANALYTICS } = await import("../mock/constants");
    return MOCK_BRIDGE_ANALYTICS;
  }

  const res = await fetch(`${BASE_URL}/stats/bridge-analytics`);
  if (!res.ok) throw new Error("Failed to fetch bridge analytics");
  return res.json();
}

export type BitcoinInfo = {
  blockHeight: number;
  feeEstimate: { satPerVbyte: number; btcPerKb: number; targetBlocks: number };
};

export async function getIndexerBitcoinInfo(): Promise<BitcoinInfo> {
  if (IS_MOCK) {
    const { MOCK_BITCOIN_INFO } = await import("../mock/constants");
    return MOCK_BITCOIN_INFO;
  }

  const res = await fetch(`${BASE_URL}/bitcoin/info`);
  if (!res.ok) throw new Error("Failed to fetch bitcoin info");
  return res.json();
}
