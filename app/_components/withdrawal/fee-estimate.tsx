import { Text } from "@/components/typography";
import useBtcFeeRates from "@/lib/hooks/useBtcFeeRates";
import BTC, { BTCDenoms } from "@/lib/twilight/denoms";
import Big from "big.js";

const TYPICAL_TX_VBYTES = 140; // P2WPKH

type Props = {
  amountSats: number;
  displayDenom: BTCDenoms;
};

export default function FeeEstimate({ amountSats, displayDenom }: Props) {
  const { data: feeRates } = useBtcFeeRates();

  if (!feeRates || amountSats <= 0) return null;

  const feeSats = Math.ceil(feeRates.halfHourFee * TYPICAL_TX_VBYTES);
  const receivedSats = Math.max(amountSats - feeSats, 0);

  if (receivedSats === 0) return null;

  const feeDisplay = BTC.format(
    new BTC("sats", Big(feeSats)).convert(displayDenom),
    displayDenom
  );
  const receivedDisplay = BTC.format(
    new BTC("sats", Big(receivedSats)).convert(displayDenom),
    displayDenom
  );

  return (
    <div className="space-y-1 rounded-md border border-primary/10 bg-primary/[0.02] px-3 py-2 text-xs">
      <div className="flex justify-between">
        <Text className="text-primary-accent">Est. network fee</Text>
        <Text>
          ~{feeDisplay} {displayDenom}
        </Text>
      </div>
      <div className="flex justify-between">
        <Text className="text-primary-accent">Fee rate</Text>
        <Text>{feeRates.halfHourFee} sat/vB</Text>
      </div>
      <div className="flex justify-between">
        <Text className="text-primary-accent">Est. received</Text>
        <Text>
          ~{receivedDisplay} {displayDenom}
        </Text>
      </div>
    </div>
  );
}
