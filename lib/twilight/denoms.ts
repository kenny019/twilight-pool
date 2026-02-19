import Big from "big.js";

export type BTCDenoms = "mBTC" | "sats" | "BTC";

enum satsFactor {
  "mBTC" = 100_000,
  "BTC" = 100_000_000,
}

enum mBTCFactor {
  "sats" = 0.00001,
  "BTC" = 1000,
}

enum BTCFactor {
  "sats" = 0.00000001,
  "mBTC" = 0.001,
}

export default class BTC {
  currentDenom: BTCDenoms;
  value: Big;

  constructor(denom: BTCDenoms, value: Big) {
    if (!denom || !value) {
      throw new Error("invalid constructor arguments");
    }

    this.currentDenom = denom;
    this.value = value;
  }

  convert(toDenom: BTCDenoms) {
    if (toDenom === this.currentDenom) {
      return this.value;
    }

    let factor = 0;

    switch (toDenom) {
      case "sats": {
        factor = satsFactor[this.currentDenom as keyof typeof satsFactor];
        break;
      }
      case "BTC": {
        factor = BTCFactor[this.currentDenom as keyof typeof BTCFactor];
        break;
      }
      case "mBTC": {
        factor = mBTCFactor[this.currentDenom as keyof typeof mBTCFactor];
        break;
      }
    }

    return this.value.mul(new Big(factor));
  }

  static formatSatsAuto(sats: number): { value: string; denom: BTCDenoms } {
    const btcValue = sats / 1e8;
    if (btcValue > 0 && btcValue < 0.01) {
      return { value: (sats / 1e5).toFixed(2), denom: "mBTC" };
    }
    return { value: btcValue.toFixed(2), denom: "BTC" };
  }

  static format(value: Big, unit?: BTCDenoms) {
    let result: string;
    switch (unit) {
      case "sats":
        return value.toFixed(0).replace(/\.?0+$/, "");
      case "mBTC":
        return value.toFixed(2).replace(/\.?0+$/, "");
      case "BTC":
        return value.toFixed(8).replace(/\.?0+$/, "");
      default:
        return value.toString();
    }
    return result === "-0" ? "0" : result;
  }
}
