"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { hybridFetchEvents, auditTransfer, auditWithdraw, auditorPublicKey, pointCoords, toHex32, fromHex, type ConfidentialEvent } from "@ctd/sdk";
import { useActiveDeployment } from "@/lib/active-deployment";
import { clientsFor } from "@/lib/rpc";
import { errMsg } from "@/lib/err";
import { stroopsToXlm } from "@/lib/format";
import { PageShell } from "@/components/page-shell";
import { ErrorBox } from "@/components/error-box";
import { Addr } from "@/components/addr";

interface AuditRow { ev: ConfidentialEvent; text: string; amount: bigint | null; senderBalance: bigint | null; channelsAgree: boolean; }
interface AccountView { address: string; spendable: bigint | null; receiving: bigint; lastLedger: number; }

function replay(events: ConfidentialEvent[], sk: bigint) {
  const rows: AuditRow[] = [];
  const accounts = new Map<string, AccountView>();
  const acct = (a: string) => { let v = accounts.get(a); if (!v) { v = { address: a, spendable: null, receiving: 0n, lastLedger: 0 }; accounts.set(a, v); } return v; };
  const seen = (a: string, l: number) => { const v = acct(a); v.lastLedger = Math.max(v.lastLedger, l); return v; };
  for (const ev of events) {
    switch (ev.type) {
      case "register": { const a = seen(ev.account, ev.ledger); a.spendable = 0n; rows.push({ ev, text: "registered", amount: null, senderBalance: null, channelsAgree: true }); break; }
      case "deposit": { const a = seen(ev.to, ev.ledger); a.receiving += ev.amount; rows.push({ ev, text: "deposit (public)", amount: ev.amount, senderBalance: null, channelsAgree: true }); break; }
      case "merge": { const a = seen(ev.account, ev.ledger); if (a.spendable !== null) a.spendable += a.receiving; a.receiving = 0n; rows.push({ ev, text: "merged receiving → spendable", amount: null, senderBalance: a.spendable, channelsAgree: true }); break; }
      case "withdraw": { const a = seen(ev.from, ev.ledger); const { senderBalance } = auditWithdraw(sk, ev); a.spendable = senderBalance; rows.push({ ev, text: "withdrawal — checkpoint decrypted", amount: ev.amount, senderBalance, channelsAgree: true }); break; }
      case "transfer": { const from = seen(ev.from, ev.ledger); const to = seen(ev.to, ev.ledger); const d = auditTransfer(sk, ev); if (d.channelsAgree) { from.spendable = d.senderBalance; to.receiving += d.amount; } rows.push({ ev, text: d.channelsAgree ? "confidential transfer — decrypted" : "transfer did NOT decrypt under this key", amount: d.channelsAgree ? d.amount : null, senderBalance: d.channelsAgree ? d.senderBalance : null, channelsAgree: d.channelsAgree }); break; }
    }
  }
  return { rows: rows.reverse(), accounts: [...accounts.values()].sort((a, b) => b.lastLedger - a.lastLedger) };
}

const BADGE: Record<string, string> = {
  transfer: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  deposit: "bg-sky-500/10 text-sky-400 border-sky-500/20",
  withdraw: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  register: "bg-violet-500/10 text-violet-400 border-violet-500/20",
  merge: "bg-white/5 text-muted-foreground border-border/40",
};

export default function AuditorPage() {
  const { active } = useActiveDeployment();
  const [rows, setRows] = useState<AuditRow[] | null>(null);
  const [accounts, setAccounts] = useState<AccountView[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const auditorSk = useMemo(() => fromHex(active.auditorSecretHex), [active.auditorSecretHex]);
  const kAud = useMemo(() => pointCoords(auditorPublicKey(auditorSk)), [auditorSk]);

  const load = useCallback(async () => {
    setBusy(true); setError(null);
    try {
      const { client, indexer } = clientsFor(active);
      const { events } = await hybridFetchEvents(client, indexer, { fromLedger: active.deployedAtLedger });
      const r = replay(events, auditorSk);
      setRows(r.rows); setAccounts(r.accounts);
    } catch (e) { setError(errMsg(e)); }
    finally { setBusy(false); }
  }, [active, auditorSk]);

  useEffect(() => { void load(); }, [load]);

  const btnCls = "rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-50 transition-all border border-border/60 text-muted-foreground hover:text-foreground hover:bg-white/5";

  return (
    <PageShell title="Auditor Console" subtitle="Designated auditor view — decrypt all transfer amounts using the auditor key. No wallet or account cooperation required." badge="Compliance">
      {error && <ErrorBox className="mb-6">{error}</ErrorBox>}
      <div className="space-y-5">
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5 backdrop-blur-sm">
          <h2 className="mb-1 font-medium text-amber-400">Auditor key (id {active.auditorId})</h2>
          <p className="mb-3 text-xs text-muted-foreground">Demo-only: this secret is published so anyone can play the auditor role. In production it lives in the auditor's vault — only the public key K_aud = k·H is registered on-chain.</p>
          <dl className="space-y-1 break-all font-mono text-xs text-muted-foreground">
            <div><dt className="inline">k: </dt><dd className="inline text-foreground/80">{active.auditorSecretHex}</dd></div>
            <div><dt className="inline">K_aud.x: </dt><dd className="inline text-foreground/80">{toHex32(kAud.x)}</dd></div>
            <div><dt className="inline">K_aud.y: </dt><dd className="inline text-foreground/80">{toHex32(kAud.y)}</dd></div>
          </dl>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card/40 p-5 backdrop-blur-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-medium">Accounts (auditor view)</h2>
            <button onClick={load} disabled={busy} className={btnCls}>{busy ? "Decrypting…" : "Reload"}</button>
          </div>
          {accounts.length === 0 && !busy && <p className="text-sm text-muted-foreground">No accounts in the retention window.</p>}
          {accounts.length > 0 && (
            <table className="w-full text-left text-xs">
              <thead><tr className="text-muted-foreground border-b border-border/40"><th className="pb-2 font-normal">account</th><th className="pb-2 font-normal">spendable</th><th className="pb-2 font-normal">receiving</th><th className="pb-2 font-normal">ledger</th></tr></thead>
              <tbody>{accounts.map((a) => (<tr key={a.address} className="border-b border-border/20"><td className="py-2"><Addr value={a.address} /></td><td className="py-2">{a.spendable === null ? "?" : `${stroopsToXlm(a.spendable)} XLM`}</td><td className="py-2">{stroopsToXlm(a.receiving)} XLM</td><td className="py-2 text-muted-foreground">{a.lastLedger}</td></tr>))}</tbody>
            </table>
          )}
        </div>

        <div className="rounded-2xl border border-border/60 bg-card/40 p-5 backdrop-blur-sm">
          <h2 className="mb-1 font-medium">Decrypted activity</h2>
          <p className="mb-4 text-xs text-muted-foreground">All token events, newest first. Confidential amounts appear in cleartext — decrypted with your auditor key alone.</p>
          {!rows && busy && <p className="text-sm text-muted-foreground">Syncing events…</p>}
          {rows?.length === 0 && <p className="text-sm text-muted-foreground">No activity in the retention window.</p>}
          {rows && (
            <ul className="space-y-2">
              {rows.map((row) => {
                const ev = row.ev;
                const parties = "from" in ev ? <><Addr value={ev.from} /> → <Addr value={ev.to} /></> : <Addr value={ev.account} />;
                return (
                  <li key={ev.cursor} className="rounded-xl border border-border/40 bg-white/[0.02] p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${BADGE[ev.type] ?? BADGE.merge}`}>{ev.type}</span>
                      <span className="text-xs text-muted-foreground">{parties}</span>
                      <span className="flex-1" />
                      {row.amount !== null && <span className="text-sm font-medium text-amber-400">{stroopsToXlm(row.amount)} XLM</span>}
                      {!row.channelsAgree && <span className="rounded-full border border-destructive/20 bg-destructive/10 px-2.5 py-0.5 text-xs text-destructive">undecryptable</span>}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">{row.text}{row.senderBalance !== null && <> · sender balance now <span className="text-foreground/80">{stroopsToXlm(row.senderBalance)} XLM</span></>}</div>
                    <div className="mt-1 font-mono text-[10px] text-muted-foreground/50">ledger {ev.ledger} · {ev.txHash.slice(0, 14)}…</div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </PageShell>
  );
}
