import { describe, expect, it } from "vitest";
import { pickConsensus } from "./useBtcReserves";
import type { MsgProposeSweepAddressAmino } from "@/lib/api/rest";

function makeMsg(
  overrides: Partial<MsgProposeSweepAddressAmino> = {}
): MsgProposeSweepAddressAmino {
  return {
    reserveId: "1",
    roundId: "1",
    btcAddress: "bc1qaaa",
    btcScript: "deadbeef00",
    judgeAddress: "twilight1judgeA",
    ...overrides,
  };
}

describe("pickConsensus", () => {
  it("picks the majority (btcAddress, btcScript) tuple", () => {
    const a1 = makeMsg({ btcAddress: "bc1qmajority", judgeAddress: "twilight1a" });
    const a2 = makeMsg({ btcAddress: "bc1qmajority", judgeAddress: "twilight1b" });
    const a3 = makeMsg({ btcAddress: "bc1qmajority", judgeAddress: "twilight1c" });
    const minority = makeMsg({
      btcAddress: "bc1qminority",
      judgeAddress: "twilight1d",
    });

    const chosen = pickConsensus([a1, a2, a3, minority]);
    expect(chosen.btcAddress).toBe("bc1qmajority");
  });

  it("breaks ties deterministically by lex-min judgeAddress", () => {
    // Two single-judge groups — must pick the one with lex-min judge.
    const groupB = makeMsg({
      btcAddress: "bc1qgroupB",
      judgeAddress: "twilight1zzz",
    });
    const groupA = makeMsg({
      btcAddress: "bc1qgroupA",
      judgeAddress: "twilight1aaa",
    });

    expect(pickConsensus([groupB, groupA]).btcAddress).toBe("bc1qgroupA");
    expect(pickConsensus([groupA, groupB]).btcAddress).toBe("bc1qgroupA");
  });

  it("within the chosen group, returns the lex-min judgeAddress entry", () => {
    const j2 = makeMsg({ judgeAddress: "twilight1bbb" });
    const j1 = makeMsg({ judgeAddress: "twilight1aaa" });
    const j3 = makeMsg({ judgeAddress: "twilight1ccc" });

    expect(pickConsensus([j3, j2, j1]).judgeAddress).toBe("twilight1aaa");
  });
});
