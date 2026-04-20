import { useQuery } from "@tanstack/react-query";
import {
  getProposedSweepAddresses,
  type BtcReserveStruct,
  type MsgProposeSweepAddressAmino,
} from "@/lib/api/rest";
import { decodeUnlockHeightFromBtcScript } from "@/lib/utils/btcScript";

// Majority-vote (btcAddress, btcScript) within a single round; tie-break deterministically
// by lex-min judgeAddress so multiple judges at the same round collapse to one entry.
function pickConsensus(
  msgs: MsgProposeSweepAddressAmino[]
): MsgProposeSweepAddressAmino {
  const groups = new Map<string, MsgProposeSweepAddressAmino[]>();
  for (const m of msgs) {
    const key = `${m.btcAddress}\0${m.btcScript}`;
    const g = groups.get(key);
    if (g) g.push(m);
    else groups.set(key, [m]);
  }
  const ranked = Array.from(groups.values()).sort((a, b) => {
    if (b.length !== a.length) return b.length - a.length;
    const ja = a.map((m) => m.judgeAddress).sort()[0];
    const jb = b.map((m) => m.judgeAddress).sort()[0];
    return ja.localeCompare(jb);
  });
  return ranked[0]
    .slice()
    .sort((a, b) => a.judgeAddress.localeCompare(b.judgeAddress))[0];
}

export default function useBtcReserves() {
  return useQuery({
    queryKey: ["btc-reserves"],
    queryFn: async (): Promise<BtcReserveStruct[]> => {
      const { success, data } = await getProposedSweepAddresses(0);
      if (!success || !data) return [];

      const byReserve = new Map<string, MsgProposeSweepAddressAmino[]>();
      for (const msg of data.proposeSweepAddressMsgs) {
        const list = byReserve.get(msg.reserveId);
        if (list) list.push(msg);
        else byReserve.set(msg.reserveId, [msg]);
      }

      const out: BtcReserveStruct[] = [];
      for (const msgs of Array.from(byReserve.values())) {
        const maxRoundId = msgs.reduce(
          (max, m) => (Number(m.roundId) > Number(max.roundId) ? m : max),
          msgs[0]
        ).roundId;
        const latestRound = msgs.filter((m) => m.roundId === maxRoundId);
        const chosen = pickConsensus(latestRound);

        try {
          out.push({
            ReserveId: chosen.reserveId,
            ReserveAddress: chosen.btcAddress,
            UnlockHeight: String(
              decodeUnlockHeightFromBtcScript(chosen.btcScript)
            ),
            RoundId: chosen.roundId,
            JudgeAddress: chosen.judgeAddress,
            BtcRelayCapacityValue: "",
            TotalValue: "",
            PrivatePoolValue: "",
            PublicValue: "",
            FeePool: "",
          });
        } catch (err) {
          console.error("useBtcReserves: skipping reserve", chosen.reserveId, err);
        }
      }

      return out.sort((a, b) => Number(a.ReserveId) - Number(b.ReserveId));
    },
    staleTime: 60_000,
  });
}
