export const STROOPS_PER_XLM = 10_000_000n;
const XLM_DECIMALS = 7;

export function xlmToStroops(input: string): bigint {
  const trimmed = input.trim();
  if (!/^\d+(\.\d+)?$/.test(trimmed)) throw new Error(`invalid XLM amount: "${input}"`);
  const [whole, frac = ""] = trimmed.split(".");
  if (frac.length > XLM_DECIMALS) throw new Error(`too many decimals: "${input}"`);
  return BigInt(whole) * STROOPS_PER_XLM + BigInt(frac.padEnd(XLM_DECIMALS, "0"));
}

export function stroopsToXlm(stroops: bigint): string {
  const neg = stroops < 0n;
  const abs = neg ? -stroops : stroops;
  const whole = abs / STROOPS_PER_XLM;
  const frac = abs % STROOPS_PER_XLM;
  const sign = neg ? "-" : "";
  if (frac === 0n) return `${sign}${whole}`;
  const fracStr = frac.toString().padStart(XLM_DECIMALS, "0").replace(/0+$/, "");
  return `${sign}${whole}.${fracStr}`;
}

export function truncateAddr(value: string, head = 6, tail = 4): string {
  return value ? `${value.slice(0, head)}…${value.slice(-tail)}` : "—";
}

export function truncatePrefix(value: string, head = 10): string {
  return value ? `${value.slice(0, head)}…` : "—";
}
