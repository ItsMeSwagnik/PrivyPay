"use client";

import { useCallback, useState, useEffect } from "react";
import { useWallet } from "@/lib/wallet-context";
import { errMsg } from "@/lib/err";
import { xlmToStroops, stroopsToXlm } from "@/lib/format";
import { useLog } from "@/lib/use-log";
import { PageShell } from "@/components/page-shell";
import { ErrorBox } from "@/components/error-box";
import { LogPanel } from "@/components/log-panel";
import { Plus, Trash2, Play } from "lucide-react";
import type { TxPhase } from "@/lib/wallet";

interface PayrollEntry { id: string; label: string; recipient: string; amount: string; }

export default function PayrollPage() {
  const { wallet, view, connecting, connect } = useWallet();
  const [logs, log] = useLog();
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<TxPhase | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [entries, setEntries] = useState<PayrollEntry[]>([
    { id: "1", label: "Employee 1", recipient: "", amount: "" },
  ]);

  const addEntry = () => setEntries((p) => [...p, { id: Date.now().toString(), label: `Employee ${p.length + 1}`, recipient: "", amount: "" }]);
  const removeEntry = (id: string) => setEntries((p) => p.filter((e) => e.id !== id));
  const update = (id: string, field: keyof PayrollEntry, val: string) => setEntries((p) => p.map((e) => e.id === id ? { ...e, [field]: val } : e));

  const runPayroll = useCallback(async () => {
    if (!wallet) return;
    const valid = entries.filter((e) => e.recipient.trim() && e.amount.trim());
    if (!valid.length) { setError("Add at least one recipient with an amount."); return; }
    const selfPay = valid.find((e) => e.recipient.trim() === wallet.address);
    if (selfPay) { setError(`"${selfPay.label}" has your own wallet address as recipient.`); return; }
    setError(null);
    setBusy(true);
    try {
      for (const entry of valid) {
        log(`proving payment → ${entry.label}…`);
        setPhase("proving");
        await wallet.transfer(entry.recipient.trim(), xlmToStroops(entry.amount), setPhase);
        log(`✓ ${entry.label} paid ${entry.amount} XLM`);
      }
      log("payroll run complete");
    } catch (e) { setError(errMsg(e)); log(`error: ${errMsg(e)}`); }
    finally { setBusy(false); setPhase(null); }
  }, [wallet, entries, log]);

  const phaseLabel = (p: TxPhase | null) => p === "proving" ? "Proving ZK…" : p === "submitting" ? "Submitting…" : "Working…";
  const inputCls = "w-full rounded-xl border border-border/60 bg-white/5 px-4 py-2.5 text-sm outline-none focus:border-primary/60 placeholder:text-muted-foreground/50";
  const btnCls = "rounded-xl px-5 py-2.5 text-sm font-medium disabled:opacity-50 transition-all";
  const total = entries.reduce((s, e) => { try { return s + (e.amount ? parseFloat(e.amount) : 0); } catch { return s; } }, 0);

  return (
    <PageShell title="Payroll" subtitle="Run confidential payroll batches. Each recipient's amount is shielded by a zero-knowledge proof." badge="Employer">
      {error && <ErrorBox className="mb-6">{error}</ErrorBox>}

      {!wallet ? (
        <div className="rounded-2xl border border-border/60 bg-card/40 p-8 backdrop-blur-sm text-center">
          <p className="mb-2 font-medium">Wallet not connected</p>
          <p className="mb-6 text-sm text-muted-foreground">Connect your wallet from the top navigation to run payroll.</p>
          <button onClick={connect} disabled={connecting} className={`${btnCls} bg-primary text-primary-foreground hover:brightness-110`}>{connecting ? "Connecting…" : "Connect wallet"}</button>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Summary */}
          <div className="rounded-2xl border border-border/60 bg-card/40 p-5 backdrop-blur-sm flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Total payroll</p>
              <p className="mt-1 text-2xl font-medium">{total.toFixed(2)} <span className="text-sm text-muted-foreground">XLM</span></p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">{entries.filter(e => e.recipient).length} recipients</p>
              <p className="mt-1 text-xs text-accent">Amounts encrypted on-chain</p>
            </div>
          </div>

          {/* Entries */}
          <div className="space-y-3">
            {entries.map((entry) => (
              <div key={entry.id} className="rounded-2xl border border-border/60 bg-card/40 p-5 backdrop-blur-sm">
                <div className="mb-3 flex items-center justify-between">
                  <input className="bg-transparent text-sm font-medium outline-none placeholder:text-muted-foreground/50 w-full" value={entry.label} onChange={(e) => update(entry.id, "label", e.target.value)} placeholder="Label" />
                  <button onClick={() => removeEntry(entry.id)} className="ml-2 shrink-0 text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="size-4" /></button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <input className={inputCls} value={entry.recipient} onChange={(e) => update(entry.id, "recipient", e.target.value)} placeholder="Recipient G-address" />
                  <div className="relative"><input className={`${inputCls} pr-12`} value={entry.amount} onChange={(e) => update(entry.id, "amount", e.target.value)} placeholder="Amount" /><span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-xs text-muted-foreground">XLM</span></div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <button onClick={addEntry} className={`${btnCls} border border-border/60 text-muted-foreground hover:text-foreground hover:bg-white/5 flex items-center gap-2`}>
              <Plus className="size-4" /> Add recipient
            </button>
            <button onClick={runPayroll} disabled={busy} className={`${btnCls} bg-primary text-primary-foreground hover:brightness-110 flex items-center gap-2`}>
              <Play className="size-4" />
              {busy ? phaseLabel(phase) : "Run payroll"}
            </button>
          </div>
        </div>
      )}
      <LogPanel logs={logs} />
    </PageShell>
  );
}
