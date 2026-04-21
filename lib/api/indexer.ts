// Authoritative shapes from `${NEXT_PUBLIC_INDEXER_BASE_URL}/api/docs.json`
// (Swagger). BASE_URL is host-only; all paths explicitly include `/api/*`.

export type IndexerDeposit = {
  id: number;
  txHash: string;
  blockHeight: number;
  reserveAddress: string;
  depositAmount: string;
  btcHeight: string;
  btcHash: string;
  twilightDepositAddress: string;
  oracleAddress: string;
  votes: number;
  confirmed: boolean;
  createdAt: string;
};

export type IndexerWithdrawal = {
  id: number;
  withdrawIdentifier: string;
  twilightAddress: string;
  withdrawAddress: string;
  withdrawReserveId: string;
  blockHeight: number;
  withdrawAmount: string;
  isConfirmed: boolean;
  createdAt: string;
};

export type IndexerAccount = {
  account: { address: string; balance: string; txCount: number };
  balances: { denom: string; amount: string }[];
  deposits: IndexerDeposit[];
  withdrawals: IndexerWithdrawal[];
  clearingAccount: unknown | null;
  zkosOperations: unknown[];
  fragmentSigners: unknown[];
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

export type BitcoinInfo = {
  blockHeight: number;
  feeEstimate: {
    satPerVbyte: number | null;
    btcPerKb: number | null;
    targetBlocks: number;
  };
};

export type IndexerTx = {
  hash: string;
  blockHeight: number;
  blockTime: string;
  type: string;
  messageTypes: string[];
  status: "success" | "failed";
  gasUsed: string;
  gasWanted: string;
  memo: string | null;
  programType: string | null;
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

type PaginatedResponse<T> = { data: T[]; pagination: IndexerPagination };

const IS_MOCK = process.env.NEXT_PUBLIC_MOCK_MODE === "true";

// Host-only base, e.g. `https://indexer.twilight.org`. Tolerate a trailing
// `/api` for back-compat with older .env files.
const BASE_URL = (process.env.NEXT_PUBLIC_INDEXER_BASE_URL ?? "")
  .replace(/\/+$/, "")
  .replace(/\/api$/, "");

export function getIndexerHttpBase(): string {
  return BASE_URL;
}

function buildUrl(path: string, params?: Record<string, unknown>): URL {
  const url = new URL(`${BASE_URL}${path}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    }
  }
  return url;
}

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

  const url = buildUrl("/api/twilight/deposits", params);
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch indexer deposits");
  return res.json();
}

export async function getIndexerDeposit(id: number | string): Promise<IndexerDeposit> {
  if (IS_MOCK) {
    const { getMockState } = await import("../mock/state");
    const dep = getMockState().indexerDeposits.find(
      (d) => String(d.id) === String(id)
    );
    if (!dep) throw new Error(`Deposit ${id} not found`);
    return dep;
  }

  const res = await fetch(buildUrl(`/api/twilight/deposits/${id}`));
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

  const url = buildUrl("/api/twilight/withdrawals", params);
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch indexer withdrawals");
  return res.json();
}

export async function getIndexerWithdrawal(
  id: number | string
): Promise<IndexerWithdrawal> {
  if (IS_MOCK) {
    const { getMockState } = await import("../mock/state");
    const wdr = getMockState().indexerWithdrawals.find(
      (w) => String(w.id) === String(id)
    );
    if (!wdr) throw new Error(`Withdrawal ${id} not found`);
    return wdr;
  }

  const res = await fetch(buildUrl(`/api/twilight/withdrawals/${id}`));
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

  const res = await fetch(buildUrl(`/api/accounts/${address}`));
  if (!res.ok) throw new Error(`Failed to fetch account ${address}`);
  return res.json();
}

export async function getIndexerTx(hash: string): Promise<IndexerTx> {
  if (IS_MOCK) {
    const { MOCK_TX } = await import("../mock/constants");
    return { ...MOCK_TX, hash };
  }

  const res = await fetch(buildUrl(`/api/txs/${hash}`));
  if (!res.ok) throw new Error(`Failed to fetch tx ${hash}`);
  return res.json();
}

export async function getIndexerBridgeAnalytics(): Promise<BridgeAnalytics> {
  if (IS_MOCK) {
    const { MOCK_BRIDGE_ANALYTICS } = await import("../mock/constants");
    return MOCK_BRIDGE_ANALYTICS;
  }

  const res = await fetch(buildUrl("/api/stats/bridge-analytics"));
  if (!res.ok) throw new Error("Failed to fetch bridge analytics");
  return res.json();
}

export async function getIndexerBitcoinInfo(): Promise<BitcoinInfo> {
  if (IS_MOCK) {
    const { MOCK_BITCOIN_INFO } = await import("../mock/constants");
    return MOCK_BITCOIN_INFO;
  }

  const res = await fetch(buildUrl("/api/bitcoin/info"));
  if (!res.ok) throw new Error("Failed to fetch bitcoin info");
  return res.json();
}
