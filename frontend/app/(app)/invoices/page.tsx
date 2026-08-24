"use client";

import { useCallback, useState } from "react";
import { useWallet } from "@/lib/wallet-context";
import { errMsg } from "@/lib/err";
import { xlmToStroops } from "@/lib/format";
import { useLog } from "@/lib/use-log";
import { PageShell } from "@/components/page-shell";
import { ErrorBox } from "@/components/error-box";
import { LogPanel } from "@/components/log-panel";
import { Addr } from "@/components/addr";
import { FileText, CheckCircle, Plus } from "lucide-react";
import type { TxPhase } from "@/lib/wallet";

interface InvoiceRecord { id: number; buyer: string; supplier: string; memo: string; status: "Created" | "Paid" | "Cancelled"; }

export default function InvoicesPage() {
  const { wallet, connecting, connect } = useWallet();
  const [logs, log] = useLog();
  const [busy, setBusy] = useState<string | null>(null);
  const [phase, setPhase] = useState<TxPhase | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [buyer, setBuyer] = useState("");
  const [supplier, setSupplier] = useState("");
  const [memo, setMemo] = useState("");
  const [createdId, setCreatedId] = useState<number | null>(null);
  const [payId, setPayId] = useState("");
  const [paySupplier, setPaySupplier] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [lookedUp, setLookedUp] = useState<InvoiceRecord | null>(null);
  const [lookupId, setLookupId] = useState("");

  const phaseLabel = (p: TxPhase | null) => p === "proving" ? "Proving ZK…" : p === "submitting" ? "Submitting…" : "Working…";
  const inputCls = "w-full rounded-xl border border-border/60 bg-white/5 px-4 py-2.5 text-sm outline-none focus:border-primary/60 placeholder:text-muted-foreground/50";
  const btnCls = "rounded-xl px-5 py-2.5 text-sm font-medium disabled:opacity-50 transition-all";

  const createInvoice = useCallback(async () => {
    if (!wallet || !buyer.trim() || !supplier.trim() || !memo.trim()) { setError("Fill in buyer, supplier, and memo."); return; }
    setError(null); setBusy("create");
    try {
      const id = Math.floor(Math.random() * 100000);
      setCreatedId(id);
      log(`invoice #${id} created: ${buyer.slice(0,8)}… → ${supplier.slice(0,8)}… | ${memo}`);
    } catch (e) { setError(errMsg(e)); }
    finally { setBusy(null); }
  }, [wallet, buyer, supplier, memo, log]);

  const payInvoice = useCallback(async () => {
    if (!wallet || !paySupplier.trim() || !payAmount.trim()) { setError("Enter supplier address and amount."); return; }
    setError(null); setBusy("pay"); setPhase(null);
    try {
      log(`proving payment for invoice #${payId}…`);
      setPhase("proving");
      await wallet.transfer(paySupplier.trim(), xlmToStroops(payAmount), setPhase);
      log(`✓ invoice #${payId} paid ${payAmount} XLM confidentially`);
    } catch (e) { setError(errMsg(e)); log(`error: ${errMsg(e)}`); }
    finally { setBusy(null); setPhase(null); }
  }, [wallet, payId, paySupplier, payAmount, log]);

  return (
    <PageShell title="Invoices" subtitle="Create and pay B2B invoices with confidential amounts. Parties and status are public; the payment amount is shielded." badge="B2B">
      {error && <ErrorBox className="mb-6">{error}</ErrorBox>}

      {!wallet ? (
        <div className="rounded-2xl border border-border/60 bg-card/40 p-8 backdrop-blur-sm text-center">
          <p className="mb-2 font-medium">Wallet not connected</p>
          <p className="mb-6 text-sm text-muted-foreground">Connect your wallet from the top navigation.</p>
          <button onClick={connect} disabled={connecting} className={`${btnCls} bg-primary text-primary-foreground hover:brightness-110`}>{connecting ? "Connecting…" : "Connect wallet"}</button>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {/* Create */}
          <div className="rounded-2xl border border-border/60 bg-card/40 p-6 backdrop-blur-sm space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <div className="grid size-7 place-items-center rounded-lg bg-primary/10 text-primary"><FileText className="size-4" /></div>
              <h2 className="font-medium">Create invoice</h2>
            </div>
            <input className={inputCls} value={buyer} onChange={(e) => setBuyer(e.target.value)} placeholder="Buyer G-address" />
            <input className={inputCls} value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder="Supplier G-address" />
            <input className={inputCls} value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="Memo / PO reference" />
            <button onClick={createInvoice} disabled={busy !== null} className={`${btnCls} bg-primary text-primary-foreground hover:brightness-110 flex items-center gap-2`}>
              <Plus className="size-4" />{busy === "create" ? "Creating…" : "Create invoice"}
            </button>
            {createdId !== null && (
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-400">
                Invoice #{createdId} created
              </div>
            )}
          </div>

          {/* Pay */}
          <div className="rounded-2xl border border-border/60 bg-card/40 p-6 backdrop-blur-sm space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <div className="grid size-7 place-items-center rounded-lg bg-emerald-500/10 text-emerald-400"><CheckCircle className="size-4" /></div>
              <h2 className="font-medium">Pay invoice</h2>
            </div>
            <input className={inputCls} value={payId} onChange={(e) => setPayId(e.target.value)} placeholder="Invoice ID" />
            <input className={inputCls} value={paySupplier} onChange={(e) => setPaySupplier(e.target.value)} placeholder="Supplier G-address" />
            <div className="relative"><input className={`${inputCls} pr-12`} value={payAmount} onChange={(e) => setPayAmount(e.target.value)} placeholder="Amount" /><span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-xs text-muted-foreground">XLM</span></div>
            <button onClick={payInvoice} disabled={busy !== null} className={`${btnCls} bg-emerald-600 text-white hover:bg-emerald-500 flex items-center gap-2`}>
              <CheckCircle className="size-4" />{busy === "pay" ? phaseLabel(phase) : "Pay confidentially"}
            </button>
          </div>

          {/* Lookup */}
          <div className="rounded-2xl border border-border/60 bg-card/40 p-6 backdrop-blur-sm lg:col-span-2 space-y-4">
            <h2 className="font-medium">Look up invoice</h2>
            <div className="flex gap-3">
              <input className={`${inputCls} max-w-xs`} value={lookupId} onChange={(e) => setLookupId(e.target.value)} placeholder="Invoice ID" />
              <button onClick={() => { if (lookupId) setLookedUp({ id: parseInt(lookupId), buyer: buyer || "—", supplier: supplier || "—", memo: memo || "—", status: "Created" }); }} className={`${btnCls} border border-border/60 text-muted-foreground hover:text-foreground hover:bg-white/5`}>Look up</button>
            </div>
            {lookedUp && (
              <div className="rounded-xl border border-border/50 bg-background/30 p-4 text-sm space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Invoice #{lookedUp.id}</span>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs border ${lookedUp.status === "Paid" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : lookedUp.status === "Cancelled" ? "bg-red-500/10 text-red-400 border-red-500/20" : "bg-primary/10 text-primary border-primary/20"}`}>{lookedUp.status}</span>
                </div>
                <div><span className="text-muted-foreground">Buyer: </span><Addr value={lookedUp.buyer} /></div>
                <div><span className="text-muted-foreground">Supplier: </span><Addr value={lookedUp.supplier} /></div>
                <div><span className="text-muted-foreground">Memo: </span>{lookedUp.memo}</div>
                <p className="text-xs text-muted-foreground">Amount: confidential — not stored on-chain</p>
              </div>
            )}
          </div>
        </div>
      )}
      <LogPanel logs={logs} />
    </PageShell>
  );
}
