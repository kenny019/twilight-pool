import type { registeredBtcAddressStruct } from "../types";
import type { WithdrawRequest } from "../api/rest";
import type { IndexerDeposit, IndexerWithdrawal } from "../api/indexer";
import {
  MOCK_TWILIGHT_ADDRESS,
  MOCK_BTC_DEPOSIT_ADDRESS,
  MOCK_SATS_BALANCE,
  MOCK_NYKS_BALANCE,
  MOCK_REGISTERED_ADDRESSES,
  MOCK_INDEXER_DEPOSITS,
  MOCK_INDEXER_WITHDRAWALS,
  MOCK_BITCOIN_INFO,
  MOCK_TX_HASH,
  MOCK_PROPOSE_SWEEP_ADDRESSES,
} from "./constants";

type MockState = {
  satsBalance: number;
  nyksBalance: number;
  registeredAddresses: registeredBtcAddressStruct[];
  withdrawRequests: WithdrawRequest[];
  indexerDeposits: IndexerDeposit[];
  indexerWithdrawals: IndexerWithdrawal[];
  blockHeight: number;
  nextWithdrawId: number;
  nextDepositId: number;
};

let state: MockState = {
  satsBalance: MOCK_SATS_BALANCE,
  nyksBalance: MOCK_NYKS_BALANCE,
  registeredAddresses: [...MOCK_REGISTERED_ADDRESSES],
  withdrawRequests: [],
  indexerDeposits: [...MOCK_INDEXER_DEPOSITS],
  indexerWithdrawals: [...MOCK_INDEXER_WITHDRAWALS],
  blockHeight: MOCK_BITCOIN_INFO.blockHeight,
  nextWithdrawId: 1,
  nextDepositId: 2,
};

export function getMockState(): Readonly<MockState> {
  return state;
}

export const getMockProposedSweepAddresses = () => ({
  proposeSweepAddressMsgs: MOCK_PROPOSE_SWEEP_ADDRESSES,
});

export function mockRegisterDeposit(
  btcAddress: string,
  amountSats: number,
  onConfirm?: () => void
): void {
  const entry: registeredBtcAddressStruct = {
    btcDepositAddress: btcAddress,
    btcSatoshiTestAmount: String(amountSats),
    twilightStakingAmount: "10000",
    twilightAddress: MOCK_TWILIGHT_ADDRESS,
    isConfirmed: false,
    CreationTwilightBlockHeight: String(state.blockHeight),
  };

  // Replace existing registration for same address, or add new
  const idx = state.registeredAddresses.findIndex(
    (a) => a.twilightAddress === MOCK_TWILIGHT_ADDRESS
  );
  if (idx >= 0) {
    state.registeredAddresses[idx] = entry;
  } else {
    state.registeredAddresses.push(entry);
  }

  // Add to indexer deposits
  const depId = `dep-${String(state.nextDepositId++).padStart(3, "0")}`;
  state.indexerDeposits.push({
    id: depId,
    btcDepositAddress: btcAddress,
    twilightAddress: MOCK_TWILIGHT_ADDRESS,
    amount: amountSats,
    confirmed: false,
    blockHeight: state.blockHeight,
    createdAt: new Date().toISOString(),
    txHash: MOCK_TX_HASH,
  });

  // Auto-confirm after 5s
  setTimeout(() => {
    entry.isConfirmed = true;
    state.satsBalance += amountSats;

    const dep = state.indexerDeposits.find((d) => d.id === depId);
    if (dep) dep.confirmed = true;

    onConfirm?.();
  }, 5_000);
}

export function mockAddWithdrawRequest(
  amountSats: number,
  reserveId: number
): void {
  if (amountSats > state.satsBalance) {
    throw new Error("Insufficient mock balance");
  }

  state.satsBalance -= amountSats;

  const id = state.nextWithdrawId++;
  state.withdrawRequests.push({
    withdrawIdentifier: id,
    withdrawAddress: MOCK_BTC_DEPOSIT_ADDRESS,
    withdrawReserveId: String(reserveId),
    withdrawAmount: String(amountSats),
    twilightAddress: MOCK_TWILIGHT_ADDRESS,
    isConfirmed: false,
    CreationTwilightBlockHeight: String(state.blockHeight),
  });

  const wdrId = `wdr-${String(id).padStart(3, "0")}`;
  state.indexerWithdrawals.push({
    id: wdrId,
    withdrawAddress: MOCK_BTC_DEPOSIT_ADDRESS,
    twilightAddress: MOCK_TWILIGHT_ADDRESS,
    amount: amountSats,
    reserveId,
    confirmed: false,
    blockHeight: state.blockHeight,
    createdAt: new Date().toISOString(),
    txHash: MOCK_TX_HASH,
  });
}
