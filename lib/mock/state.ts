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
  const depId = state.nextDepositId++;
  state.indexerDeposits.push({
    id: depId,
    txHash: MOCK_TX_HASH,
    blockHeight: state.blockHeight,
    reserveAddress: "bc1qreserve0address0one0for0testing0000tq4aaa",
    depositAmount: String(amountSats),
    btcHeight: String(state.blockHeight),
    btcHash: "0000".repeat(16),
    twilightDepositAddress: btcAddress,
    oracleAddress: "twilight1oracle0mock0address00000000000",
    votes: 1,
    confirmed: false,
    createdAt: new Date().toISOString(),
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

  state.indexerWithdrawals.push({
    id,
    withdrawIdentifier: String(id),
    twilightAddress: MOCK_TWILIGHT_ADDRESS,
    withdrawAddress: MOCK_BTC_DEPOSIT_ADDRESS,
    withdrawReserveId: String(reserveId),
    blockHeight: state.blockHeight,
    withdrawAmount: String(amountSats),
    isConfirmed: false,
    createdAt: new Date().toISOString(),
  });
}
