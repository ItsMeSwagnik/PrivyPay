export const STROOPS_PER_XLM = 10_000_000n;
const XLM_DECIMALS = 7;

export function xlmToStroops(input: string): bigint {
  const trimmed = input.trim();
  if (!/^\d+(\.\d+)?$/.test(trimmed)) throw new Error(`invalid XLM amount: "${input}"`);
  const [whole, frac = ""] = trimmed.split(".");
  if (frac.length > XLM_DECIMALS) throw new Error(`too many decimals: "${input}"`);
  return BigInt(whole) * STROOPS_PER_XLM + BigInt(frac.padEnd(XLM_DECIMALS, "0"));
}

export function stroopsToXlm(stroops: bigint, maxDecimals: number = XLM_DECIMALS): string {
  const neg = stroops < 0n;
  const abs = neg ? -stroops : stroops;
  const whole = abs / STROOPS_PER_XLM;
  const frac = abs % STROOPS_PER_XLM;
  const sign = neg ? "-" : "";
  if (frac === 0n) return `${sign}${whole}`;
  let fracStr = frac.toString().padStart(XLM_DECIMALS, "0");
  // Trim trailing zeros but keep at least 1 decimal for consistency
  fracStr = fracStr.replace(/0+$/, "") || "0";
  // Limit to maxDecimals if specified
  if (maxDecimals < XLM_DECIMALS) {
    fracStr = fracStr.slice(0, maxDecimals);
  }
  return `${sign}${whole}.${fracStr}`;
}

export function stroopsToXlmCompact(stroops: bigint, maxDecimals: number = 4): string {
  const neg = stroops < 0n;
  const abs = neg ? -stroops : stroops;
  const whole = abs / STROOPS_PER_XLM;
  const frac = abs % STROOPS_PER_XLM;
  const sign = neg ? "-" : "";
  
  // For very large numbers, use scientific notation
  const wholeStr = whole.toString();
  if (wholeStr.length > 12) {
    // Convert to number for scientific notation (safe for display purposes)
    const value = Number(whole) + Number(frac) / Number(STROOPS_PER_XLM);
    return `${sign}${value.toExponential(4)}`;
  }
  
  if (frac === 0n) return `${sign}${whole}`;
  let fracStr = frac.toString().padStart(XLM_DECIMALS, "0");
  // Trim trailing zeros but keep at least 1 decimal for consistency
  fracStr = fracStr.replace(/0+$/, "") || "0";
  // Limit to maxDecimals if specified
  if (maxDecimals < XLM_DECIMALS) {
    fracStr = fracStr.slice(0, maxDecimals);
  }
  return `${sign}${whole}.${fracStr}`;
}

export function truncateAddr(value: string, head = 6, tail = 4): string {
  return value ? `${value.slice(0, head)}…${value.slice(-tail)}` : "—";
}

export function truncatePrefix(value: string, head = 10): string {
  return value ? `${value.slice(0, head)}…` : "—";
}
