"use client";

import { useCallback, useState } from "react";
import { useWallet } from "@/lib/wallet-context";
import { errMsg } from "@/lib/err";
import { xlmToStroops, stroopsToXlm } from "@/lib/format";
import { useLog } from "@/lib/use-log";
import { PageShell } from "@/components/page-shell";
import { ErrorBox } from "@/components/error-box";
import { LogPanel } from "@/components/log-panel";
import { Addr } from "@/components/addr";
import { FileText, CheckCircle, Plus, XCircle, Copy, Share2 } from "lucide-react";
import { toast } from "sonner";
import type { TxPhase, InvoiceRecord } from "@/lib/wallet";

export default function InvoicesPage() {
  const { wallet, connecting, connect } = useWallet();
  const [logs, log] = useLog();
  const [busy, setBusy] = useState<string | null>(null);
  const [phase, setPhase] = useState<TxPhase | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [buyer, setBuyer] = useState("");
  const [memo, setMemo] = useState("");
  const [requestedAmount, setRequestedAmount] = useState("");
  const [createdId, setCreatedId] = useState<bigint | null>(null);

  const [payToken, setPayToken] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [payAmountLocked, setPayAmountLocked] = useState(false);
  const [payInvoiceData, setPayInvoiceData] = useState<InvoiceRecord | null>(null);

  const [lookupId, setLookupId] = useState("");
  const [lookedUp, setLookedUp] = useState<InvoiceRecord | null>(null);

  const phaseLabel = (p: TxPhase | null) => p === "proving" ? "Proving ZK…" : p === "submitting" ? "Submitting…" : "Working…";
  const inputCls = "w-full rounded-xl border border-border/60 bg-white/5 px-4 py-2.5 text-sm outline-none focus:border-primary/60 placeholder:text-muted-foreground/50";
  const btnCls = "rounded-xl px-5 py-2.5 text-sm font-medium disabled:opacity-50 transition-all";

  const [createdToken, setCreatedToken] = useState<string | null>(null);

  const createInvoice = useCallback(async () => {
    if (!wallet || !buyer.trim() || !memo.trim() || !requestedAmount.trim()) { setError("Fill in buyer address, memo, and requested amount."); return; }
    if (buyer.trim() === wallet.address) { setError("Buyer cannot be your own wallet address."); return; }
    setError(null); setBusy("create");
    try {
      const amountStroops = xlmToStroops(requestedAmount);
      const { ciphertext, ephemeralPub } = await wallet.invoiceEncryptAmount(buyer.trim(), amountStroops);
      const id = await wallet.invoiceCreate(buyer.trim(), wallet.address, memo.trim());
      setCreatedId(id);
      setCreatedToken(`${id}.${ciphertext}.${ephemeralPub}`);
      log(`✓ invoice #${id} created on-chain`);
    } catch (e) { setError(errMsg(e)); log(`error: ${errMsg(e)}`); }
    finally { setBusy(null); }
  }, [wallet, buyer, memo, requestedAmount, log]);

  const fetchInvoiceForPay = useCallback(async () => {
    if (!wallet || !payToken.trim()) return;
    setError(null); setBusy("fetch-pay");
    try {
      const parts = payToken.trim().split(".");
      const rawId = parts[0];
      const data = await wallet.invoiceGet(BigInt(rawId));
      setPayInvoiceData(data);
      if (parts.length === 3) {
        const stroops = await wallet.invoiceDecryptAmount(parts[1], parts[2]);
        setPayAmount(stroopsToXlm(stroops));
        setPayAmountLocked(true);
      } else {
        setPayAmountLocked(false);
      }
    } catch (e) { setError(errMsg(e)); }
    finally { setBusy(null); }
  }, [wallet, payToken]);

  const payInvoice = useCallback(async () => {
    if (!wallet || !payInvoiceData || !payAmount.trim()) { setError("Load the invoice first."); return; }
    setError(null); setBusy("pay"); setPhase(null);
    try {
      await wallet.invoicePay(payInvoiceData.id, payInvoiceData.supplier, xlmToStroops(payAmount), setPhase);
      log(`✓ invoice #${payInvoiceData.id} paid confidentially`);
      setPayInvoiceData({ ...payInvoiceData, status: "Paid" });
    } catch (e) { setError(errMsg(e)); log(`error: ${errMsg(e)}`); }
    finally { setBusy(null); setPhase(null); }
  }, [wallet, payInvoiceData, payAmount, log]);

  const lookupInvoice = useCallback(async () => {
    if (!wallet || !lookupId.trim()) return;
    setError(null); setBusy("lookup");
    try {
      const rawId = lookupId.trim().split(".")[0];
      setLookedUp(await wallet.invoiceGet(BigInt(rawId)));
    } catch (e) { setError(errMsg(e)); setLookedUp(null); }
    finally { setBusy(null); }
  }, [wallet, lookupId]);

  const cancelInvoice = useCallback(async (id: bigint) => {
    if (!wallet) return;
    setError(null); setBusy("cancel");
    try {
      await wallet.invoiceCancel(id);
      log(`✓ invoice #${id} cancelled`);
      if (lookedUp?.id === id) setLookedUp({ ...lookedUp, status: "Cancelled" });
    } catch (e) { setError(errMsg(e)); log(`error: ${errMsg(e)}`); }
    finally { setBusy(null); }
  }, [wallet, lookedUp, log]);

  const statusBadge = (s: string) =>
    s === "Paid" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
    s === "Cancelled" ? "bg-red-500/10 text-red-400 border-red-500/20" :
    "bg-primary/10 text-primary border-primary/20";

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
            <div className="flex items-center gap-2">
              <div className="grid size-7 place-items-center rounded-lg bg-primary/10 text-primary"><FileText className="size-4" /></div>
              <h2 className="font-medium">Create invoice</h2>
            </div>
            <p className="text-xs text-muted-foreground">As the supplier, request payment from a buyer. Your connected wallet is the supplier.</p>
            <div className="rounded-lg border border-border/40 bg-white/[0.02] px-3 py-2 text-xs text-muted-foreground">
              <span className="text-muted-foreground/60">Supplier (you): </span>
              <span className="font-mono">{wallet.address.slice(0, 6)}…{wallet.address.slice(-4)}</span>
            </div>
            <input className={inputCls} value={buyer} onChange={(e) => setBuyer(e.target.value)} placeholder="Buyer G-address" />
            <input className={inputCls} value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="Memo / PO reference (public)" />
            <div className="relative">
              <input className={`${inputCls} pr-12`} value={requestedAmount} onChange={(e) => setRequestedAmount(e.target.value)} placeholder="Requested amount" />
              <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-xs text-muted-foreground">XLM</span>
            </div>
            <button onClick={createInvoice} disabled={busy !== null} className={`${btnCls} bg-primary text-primary-foreground hover:brightness-110 flex items-center gap-2`}>
              <Plus className="size-4" />{busy === "create" ? "Submitting…" : "Create invoice"}
            </button>
            {createdId !== null && (
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-3">
                <div className="flex items-center gap-2 text-emerald-400">
                  <CheckCircle className="size-4 shrink-0" />
                  <span className="text-sm font-medium">Invoice #{createdId.toString()} created on-chain</span>
                </div>
                <div className="rounded-lg border border-border/40 bg-background/40 px-3 py-2 flex items-center justify-between gap-3 overflow-hidden">
                  <span className="font-mono text-xs truncate text-muted-foreground">{createdToken}</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(createdToken!);
                      toast.success("Invoice token copied", { description: "The amount is encrypted — only the buyer can read it." });
                    }}
                    className="shrink-0 flex items-center gap-1.5 rounded-lg border border-border/60 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all"
                  >
                    <Copy className="size-3.5" /> Copy
                  </button>
                </div>
                <div className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2.5">
                  <Share2 className="size-3.5 shrink-0 mt-0.5 text-amber-400" />
                  <p className="text-xs leading-5 text-amber-300/80">
                    <span className="font-medium text-amber-400">Send this token to the buyer.</span> The requested amount is encrypted to their key — only they can decrypt it. Anyone else who sees this token learns nothing about the amount.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Pay */}
          <div className="rounded-2xl border border-border/60 bg-card/40 p-6 backdrop-blur-sm space-y-4">
            <div className="flex items-center gap-2">
              <div className="grid size-7 place-items-center rounded-lg bg-emerald-500/10 text-emerald-400"><CheckCircle className="size-4" /></div>
              <h2 className="font-medium">Pay invoice</h2>
            </div>
            <p className="text-xs text-muted-foreground">Paste the token the supplier shared with you. The requested amount will be pre-filled.</p>
            <div className="flex gap-2">
              <input className={inputCls} value={payToken} onChange={(e) => { setPayToken(e.target.value); setPayInvoiceData(null); setPayAmount(""); setPayAmountLocked(false); }} placeholder="Invoice token (from supplier)" />
              <button onClick={fetchInvoiceForPay} disabled={busy !== null || !payToken.trim()}
                className="shrink-0 rounded-xl border border-border/60 px-4 text-sm text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all disabled:opacity-50">
                {busy === "fetch-pay" ? "…" : "Load"}
              </button>
            </div>
            {payInvoiceData && (
              <div className="rounded-xl border border-border/50 bg-background/30 p-3 text-xs space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Invoice #{payInvoiceData.id.toString()}</span>
                  <span className={`rounded-full border px-2 py-0.5 ${statusBadge(payInvoiceData.status)}`}>{payInvoiceData.status}</span>
                </div>
                <div><span className="text-muted-foreground">Buyer: </span><Addr value={payInvoiceData.buyer} /></div>
                <div><span className="text-muted-foreground">Supplier: </span><Addr value={payInvoiceData.supplier} /></div>
                <div><span className="text-muted-foreground">Memo: </span>{payInvoiceData.memo}</div>
              </div>
            )}
            {payInvoiceData?.status === "Created" && (
              <>
                <div className="relative">
                  <input
                    className={`${inputCls} pr-12 ${payAmountLocked ? "opacity-70 cursor-not-allowed" : ""}`}
                    value={payAmount}
                    onChange={(e) => !payAmountLocked && setPayAmount(e.target.value)}
                    readOnly={payAmountLocked}
                    placeholder="Amount"
                  />
                  <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-xs text-muted-foreground">XLM</span>
                </div>
                {payAmountLocked && (
                  <p className="text-xs text-amber-400/80">Amount set by supplier — cannot be changed.</p>
                )}
                <button onClick={payInvoice} disabled={busy !== null}
                  className={`${btnCls} bg-emerald-600 text-white hover:bg-emerald-500 flex items-center gap-2`}>
                  <CheckCircle className="size-4" />{busy === "pay" ? phaseLabel(phase) : "Pay confidentially"}
                </button>
              </>
            )}
          </div>

          {/* Lookup + cancel */}
          <div className="rounded-2xl border border-border/60 bg-card/40 p-6 backdrop-blur-sm lg:col-span-2 space-y-4">
            <h2 className="font-medium">Look up invoice</h2>
            <div className="flex gap-3">
              <input className={`${inputCls} max-w-xs`} value={lookupId} onChange={(e) => setLookupId(e.target.value)}
                placeholder="Invoice ID or token" onKeyDown={(e) => e.key === "Enter" && lookupInvoice()} />
              <button onClick={lookupInvoice} disabled={busy !== null || !lookupId.trim()}
                className={`${btnCls} border border-border/60 text-muted-foreground hover:text-foreground hover:bg-white/5`}>
                {busy === "lookup" ? "Loading…" : "Look up"}
              </button>
            </div>
            {lookedUp && (
              <div className="rounded-xl border border-border/50 bg-background/30 p-4 text-sm space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Invoice #{lookedUp.id.toString()}</span>
                    <span className={`rounded-full border px-2.5 py-0.5 text-xs ${statusBadge(lookedUp.status)}`}>{lookedUp.status}</span>
                  </div>
                  {lookedUp.status === "Created" && (
                    <button onClick={() => cancelInvoice(lookedUp.id)} disabled={busy !== null}
                      className="flex items-center gap-1.5 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50">
                      <XCircle className="size-3.5" /> Cancel
                    </button>
                  )}
                </div>
                <div><span className="text-muted-foreground">Buyer: </span><Addr value={lookedUp.buyer} /></div>
                <div><span className="text-muted-foreground">Supplier: </span><Addr value={lookedUp.supplier} /></div>
                <div><span className="text-muted-foreground">Memo: </span>{lookedUp.memo}</div>
                <p className="text-xs text-muted-foreground">Amount: confidential — shielded by ZK proof, not stored on-chain</p>
              </div>
            )}
          </div>

        </div>
      )}
      <LogPanel logs={logs} />
    </PageShell>
  );
}
