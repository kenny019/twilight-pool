import { twilightproject } from "twilightjs";

import Long from "long";
import { ZkAccount } from "../types";

async function createFundingToTradingTransferMsg({
  twilightAddress,
  transferAmount,
  account,
  accountHex,
}: {
  twilightAddress: string;
  transferAmount: number;
  account: ZkAccount;
  accountHex: string;
}) {
  const { mintBurnTradingBtc } =
    twilightproject.nyks.zkos.MessageComposer.withTypeUrl;

  const msg = mintBurnTradingBtc({
    btcValue: Long.fromNumber(transferAmount),
    encryptScalar: account.scalar,
    mintOrBurn: true,
    qqAccount: accountHex,
    twilightAddress,
  });

  return msg;
}

export { createFundingToTradingTransferMsg };
