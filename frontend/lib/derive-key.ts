import { frMod, fromBytesBE } from "@ctd/sdk";

export function keyDerivationMessage(networkPassphrase: string, tokenContract: string): string {
  return [
    "PrivyPay — confidential key derivation v1",
    "",
    "Signing this message derives your confidential spending key.",
    "Only sign it on the official PrivyPay app.",
    "",
    `Network: ${networkPassphrase}`,
    `Token contract: ${tokenContract}`,
  ].join("\n");
}

export async function skFromSignature(signature: Uint8Array): Promise<bigint> {
  const digest = await crypto.subtle.digest("SHA-512", signature as BufferSource);
  const sk = frMod(fromBytesBE(new Uint8Array(digest)));
  if (sk === 0n) throw new Error("degenerate key derivation (zero scalar)");
  return sk;
}
