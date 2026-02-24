/**
 * Lend page metric helpers.
 */

export function median(values: number[], n?: number): number | null {
  if (!values.length) return null;
  const slice = n ? values.slice(-n) : [...values];
  if (!slice.length) return null;
  const sorted = [...slice].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function periodReturnFromApy(apyPct: number, days: number): number {
  const apyDecimal = apyPct / 100;
  return Math.pow(1 + apyDecimal, days / 365) - 1;
}

export function formatReturnPct(returnDecimal: number): string {
  const pct = returnDecimal * 100;
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${pct.toFixed(2)}%`;
}

export function formatUtilizationPct(util: number): string {
  const pct = util <= 1 ? util * 100 : util;
  return `${pct.toFixed(1)}%`;
}

export function getUtilSeverity(
  utilPct: number
): "LOW" | "MEDIUM" | "HIGH" | null {
  if (Number.isNaN(utilPct)) return null;
  if (utilPct < 30) return "LOW";
  if (utilPct < 70) return "MEDIUM";
  return "HIGH";
}

export function getNetDirection(
  netBtc: number
): "LONG" | "SHORT" | "NEUTRAL" {
  if (Math.abs(netBtc) < 0.0001) return "NEUTRAL";
  return netBtc > 0 ? "LONG" : "SHORT";
}
