"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useWallet } from "@/lib/wallet-context";
import { errMsg } from "@/lib/err";
import { stroopsToXlm, xlmToStroops, truncateAddr } from "@/lib/format";
import { useLog } from "@/lib/use-log";
import { PageShell } from "@/components/page-shell";
import { ErrorBox } from "@/components/error-box";
import { LogPanel } from "@/components/log-panel";
import { Addr } from "@/components/addr";
import { ChevronDown, RefreshCw } from "lucide-react";
import type { TxPhase } from "@/lib/wallet";

type Tab = "deposit" | "withdraw" | "transfer" | "merge";

const TAB_COLORS: Record<Tab, string> = {
  deposit: "border-sky-500/60 bg-sky-500/10 text-sky-300",
  withdraw: "border-amber-500/60 bg-amber-500/10 text-amber-300",
  transfer: "border-violet-500/60 bg-violet-500/10 text-violet-300",
  merge: "border-emerald-500/60 bg-emerald-500/10 text-emerald-300",
};
const BTN_COLORS: Record<Tab, string> = {
  deposit: "bg-sky-600 hover:bg-sky-500 text-white",
  withdraw: "bg-amber-600 hover:bg-amber-500 text-white",
  transfer: "bg-violet-600 hover:bg-violet-500 text-white",
  merge: "bg-emerald-600 hover:bg-emerald-500 text-white",
};

export default function WalletPage() {
  const { wallet, view, connecting, error: ctxError, connect, refreshView } = useWallet();
  const [logs, log] = useLog();
  const [busy, setBusy] = useState<string | null>(null);
  const [phase, setPhase] = useState<TxPhase | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("deposit");
  const [recipients, setRecipients] = useState<string[]>([]);
  const [recipientsLoaded, setRecipientsLoaded] = useState(false);
  const [depositAmt, setDepositAmt] = useState("10");
  const [withdrawAmt, setWithdrawAmt] = useState("5");
  const [transferTo, setTransferTo] = useState("");
  const [transferAmt, setTransferAmt] = useState("5");

  // Load recipients whenever wallet becomes available
  useEffect(() => {
    if (!wallet || recipientsLoaded) return;
    wallet.registeredRecipients().then((r) => {
      setRecipients(r);
      setRecipientsLoaded(true);
    }).catch(() => {});
  }, [wallet, recipientsLoaded]);

  const reloadRecipients = useCallback(async () => {
    if (!wallet) return;
    const r = await wallet.registeredRecipients();
    setRecipients(r);
  }, [wallet]);

  const run = useCallback(
    (label: string, fn: () => Promise<void>) => async () => {
      setError(null);
      setBusy(label);
      setPhase(null);
      try {
        await fn();
        await refreshView();
        if (label === "connect" && wallet) {
          setRecipients(await wallet.registeredRecipients());
        }
      } catch (e) {
        setError(errMsg(e));
        log(`error: ${errMsg(e)}`);
      } finally {
        setBusy(null);
        setPhase(null);
      }
    },
    [wallet, log, refreshView],
  );

  const phaseLabel = (p: TxPhase | null) =>
    p === "proving" ? "Proving ZK…" : p === "submitting" ? "Submitting…" : "Working…";

  const inputCls = "w-full rounded-xl border border-border/60 bg-white/5 px-4 py-2.5 text-sm outline-none focus:border-primary/60 placeholder:text-muted-foreground/50 backdrop-blur-sm";
  const btnCls = "rounded-xl px-5 py-2.5 text-sm font-medium disabled:opacity-50 transition-all";

  return (
    <PageShell title="Wallet" subtitle="Manage your confidential balance on Stellar." badge="Confidential">
      {(error || ctxError) && <ErrorBox className="mb-6">{error || ctxError}</ErrorBox>}

      {!wallet ? (
        <div className="rounded-2xl border border-border/60 bg-card/40 p-8 backdrop-blur-sm text-center">
          <div className="mx-auto mb-4 grid size-12 place-items-center rounded-xl border border-primary/30 bg-primary/10 text-primary">
            <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 12V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-2" strokeLinecap="round"/><path d="M16 12a2 2 0 1 0 4 0 2 2 0 0 0-4 0Z"/></svg>
          </div>
          <p className="mb-1 font-medium">Connect your wallet</p>
          <p className="mb-6 text-sm text-muted-foreground">Use the Connect wallet button in the top navigation to get started.</p>
          <button onClick={connect} disabled={connecting} className={`${btnCls} bg-primary text-primary-foreground hover:brightness-110`}>
            {connecting ? "Connecting…" : "Connect wallet"}
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Balance card */}
          {view && (
            <div className="rounded-2xl border border-border/60 bg-card/40 p-6 backdrop-blur-sm">
              <div className="mb-5 flex items-center justify-between">
                <Addr value={view.address} className="text-xs text-muted-foreground" />
                {view.matchesChain !== null && (
                  <span className={`rounded-full px-2.5 py-0.5 text-xs ${view.matchesChain ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"}`}>
                    {view.matchesChain ? "verified ✓" : "mismatch ✗"}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl border border-border/50 bg-background/30 p-4">
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">Spendable</p>
                  <p className="mt-2 text-2xl font-medium">{stroopsToXlm(view.spendable)}<span className="ml-1 text-sm text-muted-foreground">XLM</span></p>
                </div>
                <div className="rounded-xl border border-border/50 bg-background/30 p-4">
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">Receiving</p>
                  <p className="mt-2 text-2xl font-medium">{stroopsToXlm(view.receiving)}<span className="ml-1 text-sm text-muted-foreground">XLM</span></p>
                </div>
              </div>
              {!view.registered && (
                <div className="mt-4 rounded-xl border border-primary/30 bg-primary/5 p-4">
                  <p className="mb-3 text-sm text-muted-foreground">Register your confidential keys on-chain to enable private transfers.</p>
                  <button onClick={run("register", () => wallet.register(setPhase))} disabled={busy !== null} className={`${btnCls} bg-primary text-primary-foreground hover:brightness-110`}>
                    {busy === "register" ? phaseLabel(phase) : "Register"}
                  </button>
                </div>
              )}
            </div>
          )}

          {view?.registered && (
            <div className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-sm overflow-hidden">
              {/* Tab bar */}
              <div className="grid grid-cols-4 border-b border-border/60">
                {(["deposit", "withdraw", "transfer", "merge"] as Tab[]).map((t) => (
                  <button key={t} onClick={() => setTab(t)}
                    className={`py-3 text-xs font-medium capitalize transition-all ${tab === t ? `border-b-2 border-primary text-primary bg-primary/5` : "text-muted-foreground hover:text-foreground hover:bg-white/5"}`}>
                    {t}
                  </button>
                ))}
              </div>
              <div className="p-6">
                {tab === "deposit" && (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">Move public XLM into your confidential receiving balance.</p>
                    <div className="relative"><input className={inputCls} value={depositAmt} onChange={(e) => setDepositAmt(e.target.value)} placeholder="Amount" /><span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-xs text-muted-foreground">XLM</span></div>
                    <button onClick={run("deposit", () => wallet.deposit(xlmToStroops(depositAmt)))} disabled={busy !== null} className={`${btnCls} ${BTN_COLORS.deposit}`}>{busy === "deposit" ? "Submitting…" : "Deposit"}</button>
                  </div>
                )}
                {tab === "withdraw" && (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">Convert spendable balance back to public XLM.</p>
                    <div className="relative"><input className={inputCls} value={withdrawAmt} onChange={(e) => setWithdrawAmt(e.target.value)} placeholder="Amount" /><span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-xs text-muted-foreground">XLM</span></div>
                    <button onClick={run("withdraw", () => wallet.withdraw(xlmToStroops(withdrawAmt), setPhase))} disabled={busy !== null} className={`${btnCls} ${BTN_COLORS.withdraw}`}>{busy === "withdraw" ? phaseLabel(phase) : "Withdraw"}</button>
                  </div>
                )}
                {tab === "transfer" && (
                  <TransferTab
                    inputCls={inputCls}
                    btnCls={btnCls}
                    btnColor={BTN_COLORS.transfer}
                    recipients={recipients}
                    transferTo={transferTo}
                    setTransferTo={setTransferTo}
                    transferAmt={transferAmt}
                    setTransferAmt={setTransferAmt}
                    busy={busy}
                    phase={phase}
                    phaseLabel={phaseLabel}
                    onReload={reloadRecipients}
                    onSend={run("transfer", () => wallet.transfer(transferTo, xlmToStroops(transferAmt), setPhase))}
                  />
                )}
                {tab === "merge" && (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">Fold your receiving balance into spendable so you can transfer or withdraw it.</p>
                    <button onClick={run("merge", () => wallet.merge())} disabled={busy !== null} className={`${btnCls} ${BTN_COLORS.merge}`}>{busy === "merge" ? "Submitting…" : `Merge ${stroopsToXlm(view.receiving)} XLM`}</button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
      <LogPanel logs={logs} />
    </PageShell>
  );
}

// ── Custom recipient dropdown ──────────────────────────────────────────────
function TransferTab({
  inputCls, btnCls, btnColor, recipients, transferTo, setTransferTo,
  transferAmt, setTransferAmt, busy, phase, phaseLabel, onReload, onSend,
}: {
  inputCls: string; btnCls: string; btnColor: string;
  recipients: string[]; transferTo: string; setTransferTo: (v: string) => void;
  transferAmt: string; setTransferAmt: (v: string) => void;
  busy: string | null; phase: TxPhase | null;
  phaseLabel: (p: TxPhase | null) => string;
  onReload: () => void; onSend: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const selected = transferTo;
  const label = selected ? truncateAddr(selected, 10, 8) : recipients.length === 0 ? "No registered accounts" : "Select recipient…";

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Send confidentially — amount stays private on-chain.</p>

      {/* Custom dropdown */}
      <div className="flex gap-2">
        <div ref={ref} className="relative flex-1">
          <button
            type="button"
            onClick={() => recipients.length > 0 && setOpen((o) => !o)}
            className={`flex w-full items-center justify-between rounded-xl border px-4 py-2.5 text-sm transition-all ${
              open ? "border-primary/60 bg-white/5" : "border-border/60 bg-white/5 hover:border-border"
            } ${recipients.length === 0 ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
          >
            <span className={`font-mono text-xs ${selected ? "text-foreground" : "text-muted-foreground"}`}>
              {label}
            </span>
            <ChevronDown className={`size-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
          </button>

          {open && (
            <div className="absolute left-0 right-0 top-full z-50 mt-1.5 overflow-hidden rounded-xl border border-border/60 bg-[oklch(0.16_0.035_264)] shadow-2xl shadow-black/60 backdrop-blur-xl">
              <div className="max-h-52 overflow-y-auto">
                {recipients.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => { setTransferTo(r); setOpen(false); }}
                    className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/5 ${
                      r === selected ? "bg-primary/10" : ""
                    }`}
                  >
                    <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-primary/10 text-[10px] font-medium text-primary">
                      {r.slice(0, 2)}
                    </span>
                    <div className="min-w-0">
                      <p className="font-mono text-xs text-foreground">{r.slice(0, 16)}…{r.slice(-12)}</p>
                      <p className="text-[10px] text-muted-foreground">Registered account</p>
                    </div>
                    {r === selected && <span className="ml-auto text-xs text-primary">✓</span>}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <button
          onClick={onReload}
          title="Refresh recipient list"
          className="shrink-0 rounded-xl border border-border/60 px-3 text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all"
        >
          <RefreshCw className="size-4" />
        </button>
      </div>

      {recipients.length === 0 && (
        <p className="text-xs text-muted-foreground">No registered accounts found. Ask the recipient to register first, then click refresh.</p>
      )}

      <div className="relative">
        <input className={inputCls} value={transferAmt} onChange={(e) => setTransferAmt(e.target.value)} placeholder="Amount" />
        <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-xs text-muted-foreground">XLM</span>
      </div>

      <button onClick={onSend} disabled={busy !== null || !selected} className={`${btnCls} ${btnColor}`}>
        {busy === "transfer" ? phaseLabel(phase) : "Send"}
      </button>
    </div>
  );
}
