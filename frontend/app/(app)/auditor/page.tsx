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
import { Lock, Unlock } from "lucide-react";

interface AuditRow { ev: ConfidentialEvent; text: string; amount: bigint | null; senderBalance: bigint | null; channelsAgree: boolean; type: string; }
interface AccountView { address: string; spendable: bigint | null; receiving: bigint; lastLedger: number; }

function replay(events: ConfidentialEvent[], sk: bigint | null) {
  const rows: AuditRow[] = [];
  const accounts = new Map<string, AccountView>();
  const acct = (a: string) => { let v = accounts.get(a); if (!v) { v = { address: a, spendable: null, receiving: 0n, lastLedger: 0 }; accounts.set(a, v); } return v; };
  const seen = (a: string, l: number) => { const v = acct(a); v.lastLedger = Math.max(v.lastLedger, l); return v; };
  for (const ev of events) {
    switch (ev.type) {
      case "register": { const a = seen(ev.account, ev.ledger); a.spendable = 0n; rows.push({ ev, text: "registered", amount: null, senderBalance: null, channelsAgree: true, type: "register" }); break; }
      case "deposit": { const a = seen(ev.to, ev.ledger); a.receiving += ev.amount; rows.push({ ev, text: "deposit (public)", amount: ev.amount, senderBalance: null, channelsAgree: true, type: "deposit" }); break; }
      case "merge": { const a = seen(ev.account, ev.ledger); if (a.spendable !== null) a.spendable += a.receiving; a.receiving = 0n; rows.push({ ev, text: "merged receiving → spendable", amount: null, senderBalance: a.spendable, channelsAgree: true, type: "merge" }); break; }
      case "withdraw": { 
        const a = seen(ev.from, ev.ledger); 
        if (sk) {
          const { senderBalance } = auditWithdraw(sk, ev); 
          a.spendable = senderBalance; 
          rows.push({ ev, text: "withdrawal — checkpoint decrypted", amount: ev.amount, senderBalance, channelsAgree: true, type: "withdraw" }); 
        } else {
          rows.push({ ev, text: "withdrawal", amount: ev.amount, senderBalance: null, channelsAgree: false, type: "withdraw" }); 
        }
        break; 
      }
      case "transfer": { 
        const from = seen(ev.from, ev.ledger); 
        const to = seen(ev.to, ev.ledger); 
        if (sk) {
          const d = auditTransfer(sk, ev); 
          if (d.channelsAgree) { 
            from.spendable = d.senderBalance; 
            to.receiving += d.amount; 
          } 
          rows.push({ ev, text: d.channelsAgree ? "confidential transfer — decrypted" : "transfer did NOT decrypt under this key", amount: d.channelsAgree ? d.amount : null, senderBalance: d.channelsAgree ? d.senderBalance : null, channelsAgree: d.channelsAgree, type: "transfer" }); 
        } else {
          rows.push({ ev, text: "confidential transfer", amount: null, senderBalance: null, channelsAgree: false, type: "transfer" }); 
        }
        break; 
      }
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
  
  // Auditor key state - input by user
  const [auditorKeyInput, setAuditorKeyInput] = useState("");
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [showKeyInput, setShowKeyInput] = useState(false);

  const auditorSk = useMemo(() => {
    if (!isUnlocked || !auditorKeyInput) return null;
    try {
      return fromHex(auditorKeyInput);
    } catch {
      return null;
    }
  }, [isUnlocked, auditorKeyInput]);

  const kAud = useMemo(() => {
    if (!auditorSk) return null;
    return pointCoords(auditorPublicKey(auditorSk));
  }, [auditorSk]);

  const load = useCallback(async () => {
    setBusy(true); 
    setError(null);
    try {
      const { client, indexer } = clientsFor(active);
      const { events } = await hybridFetchEvents(client, indexer, { fromLedger: active.deployedAtLedger });
      const r = replay(events, auditorSk);
      setRows(r.rows); 
      setAccounts(r.accounts);
    } catch (e) { 
      setError(errMsg(e)); 
    }
    finally { 
      setBusy(false); 
    }
  }, [active, auditorSk]);

  useEffect(() => { 
    void load(); 
  }, [isUnlocked, auditorSk, load]);

  const handleKeySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (auditorKeyInput && auditorKeyInput.startsWith("0x") && auditorKeyInput.length === 66) {
      setIsUnlocked(true);
    } else {
      setError("Invalid key format. Must be a 64-character hex string with 0x prefix (e.g., 0x00a93ee9...)");
    }
  };

  const handleLock = () => {
    setIsUnlocked(false);
    setAuditorKeyInput("");
    setRows(null);
    setAccounts([]);
    setError(null);
  };

  const btnCls = "rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-50 transition-all border border-border/60 text-muted-foreground hover:text-foreground hover:bg-white/5";

  return (
    <PageShell 
      title="Auditor Console" 
      subtitle="Compliance view — confidential transfer amounts are encrypted by default. Enter the auditor key to decrypt." 
      badge="Compliance"
    >
      {error && <ErrorBox className="mb-6">{error}</ErrorBox>}
      
      {/* Auditor Key Input Section */}
      {!isUnlocked && (
        <div className="rounded-2xl border border-border/60 bg-card/40 p-6 backdrop-blur-sm">
          <h2 className="mb-2 font-medium">Auditor Key Required</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Confidential transfer amounts are encrypted on-chain using Pedersen commitments. 
            Enter the designated auditor secret key to decrypt and view all transfer amounts.
          </p>
          
          <form onSubmit={handleKeySubmit} className="space-y-4">
            <div>
              <label htmlFor="auditor-key" className="block text-xs font-medium text-muted-foreground mb-2">
                Enter Auditor Secret Key (hex format)
              </label>
              <input
                id="auditor-key"
                type="password"
                value={auditorKeyInput}
                onChange={(e) => setAuditorKeyInput(e.target.value)}
                placeholder="0x..."
                className="w-full rounded-xl border border-border/60 bg-white/5 px-4 py-3 font-mono text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
              />
              <p className="mt-2 text-xs text-muted-foreground">
                Format: 64-character hex string with 0x prefix (e.g., 0x00a93ee91f6bd0ed...)
              </p>
            </div>
            
            <button
              type="submit"
              disabled={!auditorKeyInput || busy}
              className={btnCls + " bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20"}
            >
              {busy ? "Decrypting..." : "Unlock Auditor View"}
            </button>
          </form>
          
          <div className="mt-6 rounded-xl border border-border/30 bg-white/[0.02] p-4">
            <h3 className="text-sm font-medium mb-2">What you'll see:</h3>
            <ul className="space-y-1 text-xs text-muted-foreground">
              <li>• <strong>Without key:</strong> Confidential transfer amounts encrypted</li>
              <li>• <strong>With key:</strong> Decrypt all confidential transfer amounts</li>
              <li>• <strong>With key:</strong> View account balances (spendable + receiving)</li>
              <li>• <strong>Always visible:</strong> Deposits, withdrawals, and public metadata</li>
            </ul>
            <p className="mt-3 text-xs text-muted-foreground">
              The auditor console shows all transaction metadata publicly. Only confidential transfer amounts are encrypted.
            </p>
          </div>
        </div>
      )}

      {/* Auditor Key Display (when unlocked) */}
      {isUnlocked && kAud && (
        <div className="rounded-2xl border border-border/60 bg-card/40 p-5 backdrop-blur-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-medium">Auditor View Unlocked</h2>
            <div className="flex gap-2">
              <button onClick={() => setShowKeyInput(!showKeyInput)} className={btnCls}>
                {showKeyInput ? "Hide" : "Change"} Key
              </button>
              <button onClick={handleLock} className={btnCls + " border-destructive/30 text-destructive hover:bg-destructive/10"}>
                Lock View
              </button>
            </div>
          </div>
          
          {showKeyInput && (
            <form onSubmit={handleKeySubmit} className="mb-4 space-y-3">
              <input
                type="text"
                value={auditorKeyInput}
                onChange={(e) => setAuditorKeyInput(e.target.value)}
                className="w-full rounded-xl border border-border/60 bg-white/5 px-4 py-2 font-mono text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/30"
              />
              <button type="submit" className={btnCls + " bg-amber-500/10 border-amber-500/30 text-amber-400"}>
                Update Key
              </button>
            </form>
          )}
          
          <dl className="space-y-1 break-all font-mono text-xs text-muted-foreground">
            <div><dt className="inline">K_aud.x: </dt><dd className="inline text-foreground/80">{toHex32(kAud.x)}</dd></div>
            <div><dt className="inline">K_aud.y: </dt><dd className="inline text-foreground/80">{toHex32(kAud.y)}</dd></div>
          </dl>
          <p className="mt-3 text-xs text-muted-foreground">
            The designated auditor public key is registered on-chain. Every confidential transfer is dual-encrypted to this key — amounts are decryptable here without any sender or recipient cooperation.
          </p>
        </div>
      )}

      {/* Accounts Table (only shown when unlocked) */}
      {isUnlocked && (
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
      )}

      {/* Activity Feed - Always visible */}
      <div className="rounded-2xl border border-border/60 bg-card/40 p-5 backdrop-blur-sm">
        <h2 className="mb-1 font-medium">
          Transaction Activity {isUnlocked && <span className="text-xs text-muted-foreground font-normal">· decrypted</span>}
        </h2>
        <p className="mb-4 text-xs text-muted-foreground">
          All token events, newest first. {!isUnlocked && "Confidential transfer amounts are encrypted."}
          {isUnlocked && "Confidential transfer amounts decrypted with auditor key."}
        </p>
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
                    {row.type === "transfer" && row.amount === null ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
                        <Lock className="h-3 w-3" />
                        Encrypted
                      </span>
                    ) : row.amount !== null ? (
                      <span className="text-sm font-medium text-amber-400">{stroopsToXlm(row.amount)} XLM</span>
                    ) : null}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {row.text}
                    {row.senderBalance !== null && (
                      <> · sender balance now <span className="text-foreground/80">{stroopsToXlm(row.senderBalance)} XLM</span></>
                    )}
                  </div>
                  <div className="mt-1 font-mono text-[10px] text-muted-foreground/50">
                    ledger {ev.ledger} · {ev.txHash.slice(0, 14)}…
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </PageShell>
  );
}
