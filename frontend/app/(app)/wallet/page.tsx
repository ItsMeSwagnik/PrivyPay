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
import { ChevronDown, RefreshCw, Share2, X, Copy } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import type { TxPhase } from "@/lib/wallet";
import type { ConfidentialEvent, TransferEvent, DisclosureRequest, DisclosureBundle } from "@ctd/sdk";

type Tab = "deposit" | "withdraw" | "transfer" | "merge";

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
  const [events, setEvents] = useState<ConfidentialEvent[] | null>(null);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    if (!wallet || recipientsLoaded) return;
    wallet.registeredRecipients().then((r) => { setRecipients(r); setRecipientsLoaded(true); }).catch(() => {});
  }, [wallet, recipientsLoaded]);

  const loadEvents = useCallback(async () => {
    if (!wallet) return;
    setEventsLoading(true);
    try { setEvents(await wallet.listEvents()); } catch { /* silent */ }
    finally { setEventsLoading(false); }
  }, [wallet]);

  useEffect(() => { void loadEvents(); }, [loadEvents]);

  const reloadRecipients = useCallback(async () => {
    if (!wallet) return;
    setRecipients(await wallet.registeredRecipients());
  }, [wallet]);

  const run = useCallback(
    (label: string, fn: () => Promise<void>) => async () => {
      setError(null); setBusy(label); setPhase(null);
      try {
        await fn();
        await refreshView();
        await loadEvents();
      } catch (e) { setError(errMsg(e)); log(`error: ${errMsg(e)}`); }
      finally { setBusy(null); setPhase(null); }
    },
    [wallet, log, refreshView, loadEvents],
  );

  const phaseLabel = (p: TxPhase | null) =>
    p === "proving" ? "Proving ZK…" : p === "submitting" ? "Submitting…" : "Working…";

  const inputCls = "w-full rounded-xl border border-border/60 bg-white/5 px-4 py-2.5 text-sm outline-none focus:border-primary/60 placeholder:text-muted-foreground/50 backdrop-blur-sm";
  const btnCls = "rounded-xl px-5 py-2.5 text-sm font-medium disabled:opacity-50 transition-all";

  const transferEvents = (events ?? []).filter((e): e is TransferEvent => e.type === "transfer");

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
          {view ? (
            <div className="rounded-2xl border border-border/60 bg-card/40 p-6 backdrop-blur-sm">
              <div className="mb-5 flex items-center justify-between">
                <Addr value={view.address} className="text-xs text-muted-foreground" />
                <div className="flex items-center gap-2">
                  {view.publicBalance !== null && (
                    <span className="rounded-full px-2.5 py-0.5 text-xs bg-sky-500/10 text-sky-400 border border-sky-500/20">
                      {view.publicBalance} XLM public
                    </span>
                  )}
                  <button onClick={refreshView} disabled={busy !== null} className="rounded-lg border border-border/60 p-1.5 text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors disabled:opacity-50" title="Refresh balance">
                    <RefreshCw className="size-3.5" />
                  </button>
                  {view.matchesChain !== null && (
                    <span className={`rounded-full px-2.5 py-0.5 text-xs ${view.matchesChain ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"}`}>
                      {view.matchesChain ? "verified ✓" : "mismatch ✗"}
                    </span>
                  )}
                </div>
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
          ) : wallet && (
            <div className="rounded-2xl border border-border/60 bg-card/40 p-6 backdrop-blur-sm">
              <div className="mb-5 flex items-center justify-between">
                <Skeleton className="h-4 w-32" />
                <div className="flex items-center gap-2">
                  <Skeleton className="h-6 w-24 rounded-full" />
                  <Skeleton className="h-8 w-8 rounded-lg" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl border border-border/50 bg-background/30 p-4">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="mt-2 h-8 w-32" />
                </div>
                <div className="rounded-xl border border-border/50 bg-background/30 p-4">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="mt-2 h-8 w-32" />
                </div>
              </div>
            </div>
          )}

          {view?.registered && (
            <div className="relative z-10 rounded-2xl border border-border/60 bg-card/40 backdrop-blur-sm">
              <div className="grid grid-cols-4 border-b border-border/60">
                {(["deposit", "withdraw", "transfer", "merge"] as Tab[]).map((t) => (
                  <button key={t} onClick={() => setTab(t)}
                    className={`py-3 text-xs font-medium capitalize transition-all ${tab === t ? "border-b-2 border-primary text-primary bg-primary/5" : "text-muted-foreground hover:text-foreground hover:bg-white/5"}`}>
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
                    inputCls={inputCls} btnCls={btnCls} btnColor={BTN_COLORS.transfer}
                    recipients={recipients} transferTo={transferTo} setTransferTo={setTransferTo}
                    transferAmt={transferAmt} setTransferAmt={setTransferAmt}
                    busy={busy} phase={phase} phaseLabel={phaseLabel}
                    onReload={reloadRecipients}
                    selfAddress={wallet.address}
                    onSend={run("transfer", () => {
                      if (transferTo === wallet.address) throw new Error("Cannot transfer to your own wallet.");
                      return wallet.transfer(transferTo, xlmToStroops(transferAmt), setPhase);
                    })}
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

          {/* Transaction history + disclosure */}
          {view?.registered && (
            <div className="rounded-2xl border border-border/60 bg-card/40 p-5 backdrop-blur-sm">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="font-medium">Transaction history</h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">Click <Share2 className="inline size-3" /> on any transfer to generate a selective disclosure proof.</p>
                </div>
                <button onClick={loadEvents} disabled={eventsLoading} className="rounded-xl border border-border/60 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all disabled:opacity-50">
                  {eventsLoading ? "Loading…" : "Refresh"}
                </button>
              </div>

              {eventsLoading && (
                <ul className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <li key={i} className="rounded-xl border border-border/40 bg-white/[0.02] p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Skeleton className="h-5 w-16 rounded-full" />
                        <Skeleton className="h-4 w-48" />
                        <span className="flex-1" />
                        <Skeleton className="h-5 w-20" />
                      </div>
                      <div className="mt-1">
                        <Skeleton className="h-3 w-32" />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              {!eventsLoading && transferEvents.length === 0 && (
                <p className="text-sm text-muted-foreground">No transfers yet.</p>
              )}
              {!eventsLoading && transferEvents.length > 0 && (
                <>
                  <ul className="space-y-2">
                    {transferEvents
                      .slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
                      .map((ev) => (
                        <TransferRow key={ev.cursor} ev={ev} wallet={wallet} address={view.address} log={log} />
                      ))}
                  </ul>
                  {transferEvents.length > ITEMS_PER_PAGE && (
                    <Pagination className="mt-4">
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              setCurrentPage((p) => Math.max(1, p - 1));
                            }}
                            className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                          />
                        </PaginationItem>
                        {[...Array(Math.ceil(transferEvents.length / ITEMS_PER_PAGE))].map((_, i) => (
                          <PaginationItem key={i}>
                            <PaginationLink
                              href="#"
                              onClick={(e) => {
                                e.preventDefault();
                                setCurrentPage(i + 1);
                              }}
                              isActive={currentPage === i + 1}
                            >
                              {i + 1}
                            </PaginationLink>
                          </PaginationItem>
                        ))}
                        <PaginationItem>
                          <PaginationNext
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              setCurrentPage((p) => Math.min(Math.ceil(transferEvents.length / ITEMS_PER_PAGE), p + 1));
                            }}
                            className={currentPage === Math.ceil(transferEvents.length / ITEMS_PER_PAGE) ? "pointer-events-none opacity-50" : ""}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}
      <LogPanel logs={logs} />
    </PageShell>
  );
}

// ── Transfer row with disclosure ───────────────────────────────────────────
function TransferRow({ ev, wallet, address, log }: {
  ev: TransferEvent; wallet: NonNullable<ReturnType<typeof useWallet>["wallet"]>;
  address: string; log: (m: string) => void;
}) {
  const isSent = ev.from === address;
  const [amount, setAmount] = useState<bigint | null | "loading">("loading");
  const [showDisclose, setShowDisclose] = useState(false);
  const [requestJson, setRequestJson] = useState("");
  const [bundle, setBundle] = useState<DisclosureBundle | null>(null);
  const [proving, setProving] = useState(false);
  const [discloseError, setDiscloseError] = useState<string | null>(null);

  useEffect(() => {
    wallet.transferAmount(ev).then(setAmount).catch(() => setAmount(null));
  }, [ev, wallet]);

  async function generateBundle() {
    setDiscloseError(null); setBundle(null); setProving(true);
    try {
      let req: DisclosureRequest;
      try { req = JSON.parse(requestJson); } catch { throw new Error("Request JSON is invalid"); }
      const b = isSent
        ? await wallet.discloseSent(ev, req)
        : await wallet.discloseReceived(ev, req);
      setBundle(b);
      log(`disclosure bundle generated for tx ${ev.txHash.slice(0, 14)}…`);
    } catch (e) { setDiscloseError(errMsg(e)); }
    finally { setProving(false); }
  }

  const copyBundle = async () => {
    if (!bundle) return;
    await navigator.clipboard.writeText(JSON.stringify(bundle, null, 2));
    log("Bundle copied to clipboard");
    toast.success("Copied", {
      description: "Disclosure bundle copied to clipboard",
    });
  };

  return (
    <li className="rounded-xl border border-border/40 bg-white/[0.02] p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${isSent ? "bg-violet-500/10 text-violet-400 border-violet-500/20" : "bg-sky-500/10 text-sky-400 border-sky-500/20"}`}>
          {isSent ? "sent" : "received"}
        </span>
        <span className="text-xs text-muted-foreground">
          <Addr value={ev.from} /> → <Addr value={ev.to} />
        </span>
        <span className="flex-1" />
        {amount === "loading" && <span className="text-xs text-muted-foreground">decrypting…</span>}
        {amount !== "loading" && amount !== null && (
          <span className="text-sm font-medium">{stroopsToXlm(amount)} XLM</span>
        )}
        {amount !== "loading" && amount === null && (
          <span className="text-xs text-muted-foreground">amount hidden</span>
        )}
        <button onClick={() => { setShowDisclose((v) => !v); setBundle(null); setDiscloseError(null); }}
          className="rounded-lg border border-border/60 p-1.5 text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors"
          title="Generate disclosure proof">
          {showDisclose ? <X className="size-3.5" /> : <Share2 className="size-3.5" />}
        </button>
      </div>
      <div className="mt-1 font-mono text-[10px] text-muted-foreground/50">
        ledger {ev.ledger} · {ev.txHash.slice(0, 14)}…
      </div>

      {showDisclose && (
        <div className="mt-3 space-y-2 border-t border-border/40 pt-3">
          <p className="text-xs text-muted-foreground">
            Paste the verifier's request JSON from the <a href="/verify" className="text-primary hover:underline">Verify page</a>, then generate the bundle to send back.
          </p>
          <textarea
            value={requestJson}
            onChange={(e) => setRequestJson(e.target.value)}
            placeholder='{"pR":{"x":"0x…","y":"0x…"},"nu":"0x…"}'
            className="w-full rounded-xl border border-border/60 bg-background/50 px-3 py-2 font-mono text-xs outline-none focus:border-primary/60 resize-none h-20"
          />
          {discloseError && <p className="text-xs text-destructive">{discloseError}</p>}
          <button onClick={generateBundle} disabled={proving || !requestJson.trim()}
            className="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition hover:brightness-110 disabled:opacity-50">
            {proving ? "Proving ZK…" : "Generate bundle"}
          </button>
          {bundle && (
            <div className="space-y-1.5">
              <p className="text-xs text-emerald-400">Bundle ready — copy and send to the verifier.</p>
              <textarea readOnly value={JSON.stringify(bundle, null, 2)}
                className="w-full rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 font-mono text-xs resize-none h-32 outline-none" />
              <button onClick={copyBundle}
                className="rounded-xl border border-border/60 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all flex items-center gap-2">
                <Copy className="size-3.5" />
                Copy bundle
              </button>
            </div>
          )}
        </div>
      )}
    </li>
  );
}

// ── Custom recipient dropdown ──────────────────────────────────────────────
function TransferTab({
  inputCls, btnCls, btnColor, selfAddress, recipients, transferTo, setTransferTo,
  transferAmt, setTransferAmt, busy, phase, phaseLabel, onReload, onSend,
}: {
  inputCls: string; btnCls: string; btnColor: string;
  selfAddress: string; recipients: string[]; transferTo: string; setTransferTo: (v: string) => void;
  transferAmt: string; setTransferAmt: (v: string) => void;
  busy: string | null; phase: TxPhase | null;
  phaseLabel: (p: TxPhase | null) => string;
  onReload: () => void; onSend: () => void;
}) {
  const filteredRecipients = recipients.filter((r) => r !== selfAddress);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const selected = transferTo;
  const label = selected
    ? `${selected.slice(0, 8)}…${selected.slice(-6)}`
    : filteredRecipients.length === 0 ? "No registered accounts" : "Select recipient…";

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Send confidentially — amount stays private on-chain.</p>
      <div className="flex gap-2">
        <div ref={containerRef} className="relative flex-1">
          <button
            type="button"
            onClick={() => filteredRecipients.length > 0 && setOpen((o) => !o)}
            className={`flex w-full items-center justify-between rounded-xl border px-4 py-2.5 text-sm transition-all ${
              open ? "border-primary/60 bg-white/5" : "border-border/60 bg-white/5 hover:border-border"
            } ${filteredRecipients.length === 0 ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
          >
            <span className={`font-mono text-xs ${selected ? "text-foreground" : "text-muted-foreground"}`}>{label}</span>
            <ChevronDown className={`size-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
          </button>
          {open && (
            <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-[100] overflow-hidden rounded-xl border border-border/60 bg-card shadow-2xl shadow-black/60">
              <div className="max-h-48 overflow-y-auto">
                {filteredRecipients.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setTransferTo(r);
                      setOpen(false);
                    }}
                    className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/5 ${
                      r === selected ? "bg-primary/10" : ""
                    }`}
                  >
                    <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-primary/10 text-[10px] font-medium text-primary">
                      {r.slice(0, 2)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-xs text-foreground">{r.slice(0, 14)}…{r.slice(-10)}</p>
                      <p className="text-[10px] text-muted-foreground">Registered account</p>
                    </div>
                    {r === selected && <span className="text-xs text-primary">✓</span>}
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
      {filteredRecipients.length === 0 && (
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
