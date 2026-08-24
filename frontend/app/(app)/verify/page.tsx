"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  type CircuitProver, proverFromArtifact, generateRecipientKeys, recipientKeysFromSecret,
  newDisclosureRequest, verifyDisclosure, DisclosureVerifyError, toHex32, fromHex,
  type RecipientKeys, type DisclosureRequest, type DisclosureBundle, type VerifiedDisclosure,
} from "@ctd/sdk";
import discloseRecipientCircuit from "@ctd/disclosure/artifacts/disclose_recipient.json";
import discloseRecipientVk from "@ctd/disclosure/artifacts/disclose_recipient.vk.json";
import discloseSenderCircuit from "@ctd/disclosure/artifacts/disclose_sender.json";
import discloseSenderVk from "@ctd/disclosure/artifacts/disclose_sender.vk.json";
import { useActiveDeployment } from "@/lib/active-deployment";
import { ensureBrowserBackend } from "@/lib/bb-loader";
import { clientsFor } from "@/lib/rpc";
import { errMsg } from "@/lib/err";
import { stroopsToXlm } from "@/lib/format";
import { PageShell } from "@/components/page-shell";
import { Addr } from "@/components/addr";

const RR_KEY = "privypay:disclosure:rR";
const REQUEST_KEY = "privypay:disclosure:request";
const ARTIFACTS = {
  disclose_recipient: { circuit: discloseRecipientCircuit, vk: discloseRecipientVk },
  disclose_sender: { circuit: discloseSenderCircuit, vk: discloseSenderVk },
} as const;

function vkBytes(b64: string): Uint8Array {
  const bin = atob(b64); const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function parseBundle(json: string): DisclosureBundle {
  let b: unknown;
  try { b = JSON.parse(json); } catch { throw new Error("bundle is not valid JSON"); }
  const bundle = b as DisclosureBundle;
  if (!(bundle?.circuitId in ARTIFACTS) || !bundle?.refE?.id || typeof bundle.refE.ledger !== "number" || !bundle?.refE?.txHash || !bundle?.proof || !bundle?.rDisc?.x || !bundle?.rDisc?.y || !bundle?.vTildeDisc)
    throw new Error("bundle must contain circuitId, refE {ledger,id,txHash}, proof, rDisc {x,y}, vTildeDisc");
  return bundle;
}

export default function VerifyPage() {
  const { active } = useActiveDeployment();
  const [keys, setKeys] = useState<RecipientKeys | null>(null);
  const [request, setRequest] = useState<DisclosureRequest | null>(null);
  const [bundleJson, setBundleJson] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<VerifiedDisclosure | null>(null);
  const [error, setError] = useState<{ stage: string; message: string } | null>(null);

  const proversRef = useRef<Map<keyof typeof ARTIFACTS, CircuitProver>>(new Map());
  useEffect(() => { const p = proversRef.current; return () => { for (const v of p.values()) void v.destroy(); p.clear(); }; }, []);
  const proverFor = useCallback((id: keyof typeof ARTIFACTS): CircuitProver => {
    let p = proversRef.current.get(id);
    if (!p) { p = proverFromArtifact(ARTIFACTS[id].circuit as never); proversRef.current.set(id, p); }
    return p;
  }, []);

  useEffect(() => {
    const storedRr = localStorage.getItem(RR_KEY);
    const k = storedRr ? recipientKeysFromSecret(fromHex(storedRr)) : generateRecipientKeys();
    if (!storedRr) localStorage.setItem(RR_KEY, toHex32(k.rR));
    setKeys(k);
    const storedReq = localStorage.getItem(REQUEST_KEY);
    if (storedReq) { const req = JSON.parse(storedReq) as DisclosureRequest; if (req.pR.x === k.pR.x && req.pR.y === k.pR.y) setRequest(req); }
  }, []);

  const mintRequest = useCallback(() => {
    if (!keys) return;
    const req = newDisclosureRequest(keys);
    localStorage.setItem(REQUEST_KEY, JSON.stringify(req));
    setRequest(req); setResult(null); setError(null);
  }, [keys]);

  const verify = useCallback(async () => {
    if (!keys || !request) return;
    setBusy(true); setResult(null); setError(null);
    try {
      ensureBrowserBackend();
      const bundle = parseBundle(bundleJson);
      const { client, indexer } = clientsFor(active);
      const artifacts = ARTIFACTS[bundle.circuitId];
      setResult(await verifyDisclosure({ client, indexer, bundle, request, keys, prover: proverFor(bundle.circuitId), pinnedVk: vkBytes(artifacts.vk.vkBase64) }));
    } catch (e) {
      if (e instanceof DisclosureVerifyError) setError({ stage: e.stage, message: e.message });
      else setError({ stage: "input", message: errMsg(e) });
    } finally { setBusy(false); }
  }, [keys, request, bundleJson, active, proverFor]);

  const inputCls = "w-full rounded-xl border border-border/60 bg-white/5 px-4 py-2.5 text-sm font-mono outline-none focus:border-primary/60 placeholder:text-muted-foreground/50";
  const btnCls = "rounded-xl px-5 py-2.5 text-sm font-medium disabled:opacity-50 transition-all";

  return (
    <PageShell title="Verify Disclosure" subtitle="For compliance desks or counterparties that need proof of a single payment. You learn exactly one amount about exactly one transfer — nothing else. No wallet required." badge="Compliance">
      <div className="space-y-5">
        {/* Step 1 */}
        <div className="rounded-2xl border border-border/60 bg-card/40 p-6 backdrop-blur-sm space-y-4">
          <div className="flex items-center gap-2">
            <span className="grid size-6 place-items-center rounded-full bg-primary/10 text-xs font-medium text-primary">1</span>
            <h2 className="font-medium">Create a disclosure request</h2>
          </div>
          <p className="text-sm text-muted-foreground">Hand this JSON to the account holder. They paste it into their wallet to generate a proof. The nonce is one-time — a proof bound to it cannot be replayed.</p>
          <div className="flex gap-3">
            <button onClick={mintRequest} disabled={!keys} className={`${btnCls} bg-primary text-primary-foreground hover:brightness-110`}>
              {request ? "New request (fresh nonce)" : "Create request"}
            </button>
            {request && (
              <button onClick={() => navigator.clipboard.writeText(JSON.stringify(request, null, 2))} className={`${btnCls} border border-border/60 text-muted-foreground hover:text-foreground hover:bg-white/5`}>
                Copy
              </button>
            )}
          </div>
          {request && <textarea readOnly className={`${inputCls} h-28 resize-none`} value={JSON.stringify(request, null, 2)} />}
        </div>

        {/* Step 2 */}
        <div className="rounded-2xl border border-border/60 bg-card/40 p-6 backdrop-blur-sm space-y-4">
          <div className="flex items-center gap-2">
            <span className="grid size-6 place-items-center rounded-full bg-primary/10 text-xs font-medium text-primary">2</span>
            <h2 className="font-medium">Verify the holder's bundle</h2>
          </div>
          <p className="text-sm text-muted-foreground">Paste the bundle the holder sent back. The event payload and contract binding are re-read from the chain — never trusted from the bundle.</p>
          <textarea className={`${inputCls} h-32 resize-none`} placeholder='{"circuitId":"disclose_recipient","refE":{…},"proof":"0x…","rDisc":{…},"vTildeDisc":"0x…"}' value={bundleJson} onChange={(e) => setBundleJson(e.target.value)} />
          <button onClick={verify} disabled={busy || !request || !bundleJson.trim()} className={`${btnCls} bg-cyan-700 text-white hover:bg-cyan-600`}>
            {busy ? "Verifying…" : "Verify against chain"}
          </button>
          {!request && <p className="text-xs text-amber-400">Create a request first.</p>}
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5 backdrop-blur-sm">
            <h2 className="mb-1 font-medium text-destructive">Rejected at: {error.stage}</h2>
            <p className="text-sm text-destructive/80">{error.message}</p>
            <p className="mt-2 text-xs text-muted-foreground">Nothing may be learned from a bundle that fails any verification step.</p>
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6 backdrop-blur-sm space-y-3">
            <h2 className="font-medium text-emerald-400">Disclosure verified ✓</h2>
            <p className="text-3xl font-medium">{stroopsToXlm(result.amount)} <span className="text-base text-muted-foreground">XLM</span></p>
            <p className="text-sm text-muted-foreground">
              {result.role === "recipient"
                ? <>Transfer in tx <span className="font-mono text-xs">{result.event.txHash.slice(0, 14)}…</span> (ledger {result.event.ledger}) paid <Addr value={result.disclosingAccount} /> exactly this amount.</>
                : <>Transfer in tx <span className="font-mono text-xs">{result.event.txHash.slice(0, 14)}…</span> (ledger {result.event.ledger}) was sent by <Addr value={result.disclosingAccount} /> for exactly this amount to <Addr value={result.event.to} />.</>
              }{" "}You learned nothing else about the account.
            </p>
            <details className="text-xs text-muted-foreground">
              <summary className="cursor-pointer text-foreground/70 hover:text-foreground">Verification steps</summary>
              <ol className="mt-2 list-decimal space-y-1 pl-5">{result.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
            </details>
          </div>
        )}
      </div>
    </PageShell>
  );
}
