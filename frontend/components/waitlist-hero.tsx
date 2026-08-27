"use client"

import { useState, useRef } from "react"
import { motion, useInView } from "framer-motion"
import { ArrowUpRight, ChevronDown, LockKeyhole, Menu, ShieldCheck, X, Zap, BookOpen, Wallet, Users, FileText, Eye, CheckCircle, ChevronRight, AlertCircle } from "lucide-react"
import { LiquidBackground } from "@/components/liquid-background"

function Reveal({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: "-80px" })
  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y: 28 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay }}
    >
      {children}
    </motion.div>
  )
}

const roles = [
  { title: "For finance teams", copy: "Run payroll, invoices, and treasury operations without exposing sensitive counterparties.", icon: ShieldCheck },
  { title: "For contributors", copy: "Get paid globally with a clean, private payment experience built for modern work.", icon: Zap },
  { title: "For compliance", copy: "Prove what matters without putting your entire financial graph on display.", icon: LockKeyhole },
]

const GUIDE_PAGES = [
  {
    id: "wallet",
    href: "/wallet",
    label: "Wallet",
    icon: Wallet,
    color: "text-sky-400",
    border: "border-sky-500/20",
    bg: "bg-sky-500/10",
    tagline: "Your confidential balance hub",
    steps: [
      { step: "Connect", detail: "Click \"Connect wallet\" in the top nav and approve the Freighter popup. Make sure Freighter is set to Testnet." },
      { step: "Register", detail: "First time? Click Register to bind your Grumpkin keypair on-chain. This is a one-time ZK proof — takes ~10 seconds." },
      { step: "Deposit", detail: "Enter an XLM amount and click Deposit. Public XLM moves into your shielded receiving balance. The amount is visible here but hidden from everyone else once transferred." },
      { step: "Merge", detail: "Before you can send, click Merge to fold your receiving balance into your spendable balance." },
      { step: "Transfer", detail: "Pick a registered recipient from the dropdown, enter an amount, and click Send. A ZK proof is generated in your browser — the amount is never stored on-chain in plaintext." },
      { step: "Withdraw", detail: "Convert spendable balance back to public XLM at any time." },
      { step: "Disclose", detail: "Click the share icon on any transfer row to generate a selective disclosure proof for a specific payment. Paste the verifier's request JSON from the Verify page first." },
    ],
  },
  {
    id: "payroll",
    href: "/payroll",
    label: "Payroll",
    icon: Users,
    color: "text-violet-400",
    border: "border-violet-500/20",
    bg: "bg-violet-500/10",
    tagline: "Batch confidential payments to employees",
    steps: [
      { step: "Connect wallet", detail: "Wallet must be connected and registered (see Wallet page)." },
      { step: "Add recipients", detail: "Each row is one employee. Paste their Stellar G-address and the XLM amount. Click \"Add recipient\" for more rows." },
      { step: "Run payroll", detail: "Click Run payroll. Each leg generates its own ZK proof sequentially. All transfers either succeed or the run stops — no partial payroll." },
      { step: "Amounts stay private", detail: "Each employee only sees their own incoming amount. No employee can see what others were paid." },
    ],
  },
  {
    id: "invoices",
    href: "/invoices",
    label: "Invoices",
    icon: FileText,
    color: "text-emerald-400",
    border: "border-emerald-500/20",
    bg: "bg-emerald-500/10",
    tagline: "B2B invoicing with private payment amounts",
    steps: [
      { step: "Create an invoice (supplier)", detail: "Fill in the buyer's G-address, your G-address as supplier, and a memo (e.g. INV-2026-001). Click Create invoice — you'll get an invoice ID. Share this ID with the buyer." },
      { step: "Buyer loads the invoice", detail: "The buyer goes to the Invoices page, pastes the invoice ID in the \"Pay invoice\" panel, and clicks Load. They'll see the invoice details and status." },
      { step: "Buyer pays", detail: "With the invoice loaded, the buyer enters the agreed amount and clicks Pay confidentially. A ZK proof is generated — the amount is never stored on-chain." },
      { step: "Check status", detail: "Anyone can look up an invoice by ID in the \"Look up invoice\" panel to see its status (Created / Paid / Cancelled) and public metadata. The payment amount remains private." },
      { step: "Cancel", detail: "Either the buyer or supplier can cancel an unpaid invoice by looking it up and clicking Cancel." },
    ],
    callout: { type: "tip", text: "The invoice amount is never an input when creating — only the buyer enters it at payment time. This is by design: the on-chain record proves payment happened without revealing the amount." },
  },
  {
    id: "auditor",
    href: "/auditor",
    label: "Auditor",
    icon: Eye,
    color: "text-amber-400",
    border: "border-amber-500/20",
    bg: "bg-amber-500/10",
    tagline: "Compliance decryption of all transfers",
    steps: [
      { step: "No key needed for metadata", detail: "The activity feed is always visible — you can see who transacted, when, and what type of event it was, without any key." },
      { step: "Enter auditor key to decrypt amounts", detail: "Paste the auditor secret key (0x… hex format) and click Unlock Auditor View. Every confidential transfer amount is now decrypted using dual-ECDH — no sender or recipient cooperation needed." },
      { step: "Filter the feed", detail: "Use the Filter button to narrow by event type (transfer, deposit, withdraw…) or by a specific account address." },
      { step: "Account balances", detail: "Once unlocked, the Accounts table shows each registered account's current spendable and receiving balance as reconstructed from on-chain events." },
      { step: "Lock when done", detail: "Click Lock View to clear the key from memory. The key is never stored — it only lives in the input field while the view is unlocked." },
    ],
    callout: { type: "info", text: "For testing, the testnet auditor key is in .env.local. In production, only the designated compliance officer should hold this key." },
  },
  {
    id: "verify",
    href: "/verify",
    label: "Verify",
    icon: CheckCircle,
    color: "text-cyan-400",
    border: "border-cyan-500/20",
    bg: "bg-cyan-500/10",
    tagline: "Prove a single payment without revealing anything else",
    steps: [
      { step: "Verifier creates a request (Step 1)", detail: "The verifier (e.g. a counterparty or auditor) opens the Verify page and clicks Create request. Copy the JSON and send it to the account holder." },
      { step: "Account holder generates a bundle", detail: "The holder opens their Wallet page, finds the relevant transfer in Transaction history, clicks the share icon, pastes the request JSON, and clicks Generate bundle. Copy the bundle JSON." },
      { step: "Verifier pastes and verifies (Step 2)", detail: "Back on the Verify page, paste the bundle into Step 2 and click Verify against chain. The proof is checked against the live chain — the amount and transaction are confirmed without revealing any other account data." },
    ],
    callout: { type: "tip", text: "Each request has a one-time nonce. A bundle generated for one request cannot be replayed against a different request." },
  },
]

const PRIVACY_EXPLAINER = [
  {
    q: "How can a transaction be private AND verifiable?",
    a: "PrivyPay uses Pedersen commitments — a cryptographic technique where the amount is replaced on-chain with a mathematical commitment. The commitment proves the math balances (no money created from nothing) without revealing the number. Only the sender, recipient, and a designated auditor hold the ECDH keys needed to decrypt the actual amount.",
  },
  {
    q: "What is actually public on-chain?",
    a: "The fact that a transfer happened, the sender and recipient addresses, the ledger number, and the transaction hash are all public. The amount is replaced by an encrypted commitment — visible to everyone, readable only by the key holders.",
  },
  {
    q: "How does selective disclosure work?",
    a: "A ZK proof is generated that says \"I am the sender/recipient of this specific on-chain transfer, and the amount was X\". The verifier checks this proof against the live chain. No other account data is revealed — not your balance, not your other transactions.",
  },
]

function Logo() {
  return (
    <span className="flex items-center gap-3" aria-label="PrivyPay home">
      <img src="/PrivyPay logo.png" alt="PrivyPay" className="h-11 w-auto object-contain" />
      <span className="font-mono text-sm font-semibold tracking-[0.28em]">PRIVYPAY</span>
    </span>
  )
}

function PrivacyExplainer() {
  const [open, setOpen] = useState<number | null>(null)
  return (
    <section id="how-it-works" className="mx-auto max-w-7xl border-t border-border/60 px-6 py-20 lg:px-10 lg:py-28">
      <Reveal className="mb-12">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-primary">Privacy + Verifiability</p>
        <h2 className="mt-4 max-w-2xl text-4xl font-medium tracking-[-0.04em] sm:text-5xl">Private transactions that can still be proven.</h2>
        <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground">PrivyPay uses zero-knowledge proofs and Pedersen commitments so amounts are shielded on-chain — yet any payment can be selectively disclosed to a third party without revealing anything else.</p>
      </Reveal>
      <div className="space-y-3">
        {PRIVACY_EXPLAINER.map((item, i) => (
          <Reveal key={i} delay={i * 0.08}>
            <motion.div
              whileHover={{ borderColor: "rgba(139,92,246,0.35)" }}
              transition={{ duration: 0.2 }}
              className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-sm overflow-hidden"
            >
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="flex w-full items-center justify-between px-6 py-5 text-left"
              >
                <span className="font-medium">{item.q}</span>
                <ChevronRight className={`size-4 shrink-0 text-muted-foreground transition-transform ${open === i ? "rotate-90" : ""}`} />
              </button>
              {open === i && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                  className="border-t border-border/40 px-6 py-5"
                >
                  <p className="text-sm leading-7 text-muted-foreground">{item.a}</p>
                </motion.div>
              )}
            </motion.div>
          </Reveal>
        ))}
      </div>
      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        {[
          { label: "On-chain", items: ["Sender address", "Recipient address", "Ledger & tx hash", "Encrypted commitment"] },
          { label: "Key holders only", items: ["Transfer amount", "Sender balance after", "Recipient balance after"] },
          { label: "Provable on demand", items: ["Specific payment amount", "Role (sent or received)", "Linked to exact tx", "Nothing else revealed"] },
        ].map((col, i) => (
          <Reveal key={col.label} delay={i * 0.1}>
            <motion.div
              whileHover={{ y: -5, borderColor: "rgba(139,92,246,0.4)" }}
              transition={{ duration: 0.25 }}
              className="rounded-2xl border border-border/60 bg-card/40 p-5 backdrop-blur-sm h-full"
            >
              <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-primary">{col.label}</p>
              <ul className="space-y-2">
                {col.items.map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="size-1.5 rounded-full bg-accent shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </motion.div>
          </Reveal>
        ))}
      </div>
    </section>
  )
}

function UserGuide() {
  const [activePage, setActivePage] = useState("wallet")
  const page = GUIDE_PAGES.find((p) => p.id === activePage)!
  const Icon = page.icon

  return (
    <section id="guide" className="mx-auto max-w-7xl border-t border-border/60 px-6 py-20 lg:px-10 lg:py-28">
      <Reveal className="mb-12">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-primary">User Guide</p>
        <h2 className="mt-4 max-w-2xl text-4xl font-medium tracking-[-0.04em] sm:text-5xl">How to use every page.</h2>
        <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground">Step-by-step instructions for each part of the app. Select a page below to get started.</p>
      </Reveal>

      <Reveal delay={0.1}>
        <div className="mb-8 flex flex-wrap gap-2">
          {GUIDE_PAGES.map((p) => {
            const PIcon = p.icon
            const isActive = activePage === p.id
            return (
              <motion.button
                key={p.id}
                onClick={() => setActivePage(p.id)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.96 }}
                transition={{ duration: 0.18 }}
                className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? `${p.bg} ${p.border} ${p.color}`
                    : "border-border/60 bg-card/40 text-muted-foreground hover:text-foreground hover:bg-white/5"
                }`}
              >
                <PIcon className="size-4" />
                {p.label}
              </motion.button>
            )
          })}
        </div>
      </Reveal>

      <Reveal delay={0.15}>
        <motion.div
          key={activePage}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-sm overflow-hidden"
        >
          <div className={`border-b border-border/60 px-6 py-5 flex items-center justify-between`}>
            <div className="flex items-center gap-3">
              <div className={`grid size-9 place-items-center rounded-xl border ${page.border} ${page.bg}`}>
                <Icon className={`size-5 ${page.color}`} />
              </div>
              <div>
                <p className={`font-medium ${page.color}`}>{page.label}</p>
                <p className="text-xs text-muted-foreground">{page.tagline}</p>
              </div>
            </div>
            <motion.a
              href={page.href}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.96 }}
              className={`hidden sm:flex items-center gap-1.5 rounded-xl border px-4 py-2 text-xs font-medium transition-all ${page.border} ${page.bg} ${page.color} hover:brightness-110`}
            >
              Open page <ArrowUpRight className="size-3.5" />
            </motion.a>
          </div>
          <div className="divide-y divide-border/40">
            {page.steps.map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
                className="flex gap-4 px-6 py-4"
              >
                <div className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border text-xs font-semibold ${page.border} ${page.bg} ${page.color}`}>
                  {i + 1}
                </div>
                <div>
                  <p className="text-sm font-medium">{s.step}</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{s.detail}</p>
                </div>
              </motion.div>
            ))}
          </div>
          {page.callout && (
            <div className={`mx-6 mb-6 mt-2 flex items-start gap-3 rounded-xl border p-4 ${
              page.callout.type === "tip"
                ? "border-primary/20 bg-primary/5"
                : "border-sky-500/20 bg-sky-500/5"
            }`}>
              <AlertCircle className={`mt-0.5 size-4 shrink-0 ${
                page.callout.type === "tip" ? "text-primary" : "text-sky-400"
              }`} />
              <p className="text-xs leading-6 text-muted-foreground">{page.callout.text}</p>
            </div>
          )}
        </motion.div>
      </Reveal>

      <Reveal delay={0.2}>
        <div className="mt-10 rounded-2xl border border-border/60 bg-card/40 p-6 backdrop-blur-sm">
          <p className="mb-5 font-mono text-[10px] uppercase tracking-[0.2em] text-primary">Recommended first-time flow</p>
          <div className="flex flex-wrap items-center gap-2">
            {[
              { label: "Install Freighter", sub: "browser extension" },
              { label: "Connect wallet", sub: "Wallet page" },
              { label: "Register", sub: "one-time ZK proof" },
              { label: "Deposit XLM", sub: "public → shielded" },
              { label: "Merge", sub: "receiving → spendable" },
              { label: "Transfer", sub: "private on-chain" },
              { label: "Verify", sub: "selective disclosure" },
            ].map((step, i, arr) => (
              <div key={step.label} className="flex items-center gap-2">
                <motion.div
                  whileHover={{ scale: 1.06, borderColor: "rgba(139,92,246,0.5)" }}
                  transition={{ duration: 0.2 }}
                  className="rounded-xl border border-border/60 bg-background/30 px-4 py-2.5 text-center"
                >
                  <p className="text-xs font-medium">{step.label}</p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">{step.sub}</p>
                </motion.div>
                {i < arr.length - 1 && <ChevronRight className="size-4 shrink-0 text-muted-foreground/40" />}
              </div>
            ))}
          </div>
        </div>
      </Reveal>
    </section>
  )
}

export default function WaitlistHero() {
  const [mobileOpen, setMobileOpen] = useState(false)



  return <div className="liquid-surface relative min-h-screen overflow-hidden bg-background text-foreground">
    <LiquidBackground />
    <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(4,7,18,0.2)_58%,rgba(4,7,18,0.72)_100%)]" />
    <header className="relative z-20 mx-auto flex max-w-7xl items-center justify-between px-6 py-6 lg:px-10">
      <a href="#top" aria-label="PrivyPay home"><Logo /></a>
      <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex"><a href="#why" className="water-text transition-colors hover:text-foreground">Why private</a><a href="#how-it-works" className="water-text transition-colors hover:text-foreground">How it works</a><a href="#guide" className="water-text transition-colors hover:text-foreground">User guide</a><a href="#product" className="water-text transition-colors hover:text-foreground">Product</a><a href="#trust" className="water-text transition-colors hover:text-foreground">Trust</a></nav>
      <a href="/wallet" className="hidden items-center gap-2 rounded-full border border-border/80 bg-card/50 px-4 py-2 text-sm font-medium backdrop-blur-md transition-colors hover:border-primary/60 md:flex">Launch app <ArrowUpRight className="size-4" /></a>
      <button className="rounded-lg border border-border/80 p-2 md:hidden" onClick={() => setMobileOpen((v) => !v)} aria-label="Toggle menu" aria-expanded={mobileOpen}>{mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}</button>
    </header>
    {mobileOpen && <nav className="relative z-20 mx-6 flex flex-col gap-4 rounded-2xl border border-border/80 bg-card/90 p-5 text-sm backdrop-blur-xl md:hidden"><a href="#why" onClick={() => setMobileOpen(false)}>Why private</a><a href="#how-it-works" onClick={() => setMobileOpen(false)}>How it works</a><a href="#guide" onClick={() => setMobileOpen(false)}>User guide</a><a href="#product" onClick={() => setMobileOpen(false)}>Product</a><a href="#trust" onClick={() => setMobileOpen(false)}>Trust</a></nav>}

    <main id="top" className="relative z-10">
      <section className="mx-auto grid max-w-7xl items-center gap-16 px-6 pb-24 pt-16 lg:grid-cols-[1.05fr_0.95fr] lg:px-10 lg:pb-36 lg:pt-24">
        <motion.div initial={{ opacity: 0, y: 36 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}>
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.2em] text-primary"><span className="size-1.5 rounded-full bg-accent" /> <span className="water-text">Confidential finance infrastructure</span></div>
          <h1 className="max-w-3xl text-balance text-5xl font-medium leading-[1.03] tracking-[-0.06em] sm:text-7xl lg:text-[6.7rem]"><span className="water-text">Money moves better </span><span className="water-text font-serif italic text-primary">in private.</span></h1>
          <p className="water-text mt-7 max-w-xl text-pretty text-base leading-7 text-muted-foreground sm:text-lg">PrivyPay is the confidential payroll and invoicing layer for teams that believe financial privacy is a feature, not a compromise.</p>
          <motion.a href="/wallet" whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} className="mt-9 inline-flex h-12 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:brightness-110">Open app <ArrowUpRight className="size-4" /></motion.a>
        </motion.div>
        <motion.div id="product" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1], delay: 0.15 }} className="relative mx-auto w-full max-w-xl">
          <div className="absolute -inset-8 rounded-[2rem] bg-primary/10 blur-3xl" />
          <motion.div whileHover={{ y: -4, boxShadow: "0 32px 64px -12px rgba(var(--primary-rgb,139,92,246),0.18)" }} transition={{ duration: 0.3 }} className="relative overflow-hidden rounded-[1.4rem] border border-border/80 bg-card/80 shadow-2xl shadow-primary/10 backdrop-blur-xl">
            <div className="flex items-center justify-between border-b border-border/70 px-5 py-4"><div><p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">PrivyPay console</p><p className="mt-1 text-sm font-medium">Treasury overview</p></div><div className="flex items-center gap-2 rounded-full bg-accent/10 px-2.5 py-1 text-[10px] text-accent"><span className="size-1.5 rounded-full bg-accent" /> Private mode</div></div>
            <div className="grid gap-5 p-5 sm:p-7">
              <div className="rounded-xl border border-border/70 bg-background/50 p-5"><div className="flex items-start justify-between"><div><p className="text-xs text-muted-foreground">Available balance</p><p className="mt-2 text-3xl font-medium tracking-tight">$248,920<span className="text-base text-muted-foreground">.40</span></p></div><div className="rounded-lg bg-primary/10 p-2 text-primary"><LockKeyhole className="size-4" /></div></div><div className="mt-6 h-20"><svg viewBox="0 0 400 80" className="h-full w-full" role="img" aria-label="Balance trend"><path d="M0 63 C35 55 44 65 70 53 S105 42 125 49 S150 40 174 44 S205 28 232 35 S260 32 280 20 S315 37 335 26 S365 19 400 8" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary"/><path d="M0 63 C35 55 44 65 70 53 S105 42 125 49 S150 40 174 44 S205 28 232 35 S260 32 280 20 S315 37 335 26 S365 19 400 8 V80 H0Z" className="fill-primary/10"/></svg></div></div>
              <div className="grid gap-3 sm:grid-cols-2">
                <motion.div whileHover={{ scale: 1.03 }} transition={{ duration: 0.2 }} className="rounded-xl border border-border/70 bg-background/40 p-4"><div className="flex items-center justify-between"><p className="text-xs text-muted-foreground">Next payroll</p><ChevronDown className="size-4 text-muted-foreground"/></div><p className="mt-4 text-lg font-medium">$86,240.00</p><p className="mt-1 text-xs text-accent">Encrypted until settlement</p></motion.div>
                <motion.div whileHover={{ scale: 1.03 }} transition={{ duration: 0.2 }} className="rounded-xl border border-border/70 bg-background/40 p-4"><p className="text-xs text-muted-foreground">Counterparties</p><p className="mt-4 text-lg font-medium">24 private</p><p className="mt-1 text-xs text-muted-foreground">Zero exposed balances</p></motion.div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </section>
      <section id="why" className="mx-auto max-w-7xl border-t border-border/60 px-6 py-20 lg:px-10 lg:py-28">
        <div className="grid gap-12 lg:grid-cols-[0.75fr_1.25fr]">
          <Reveal>
            <p className="water-text font-mono text-[11px] uppercase tracking-[0.2em] text-primary">A quieter ledger</p>
            <h2 className="water-text mt-4 max-w-md text-4xl font-medium tracking-[-0.04em] sm:text-5xl">Privacy for the parts that matter.</h2>
          </Reveal>
          <div className="grid gap-4 md:grid-cols-3">
            {roles.map((role, i) => {
              const Icon = role.icon
              return (
                <Reveal key={role.title} delay={i * 0.1}>
                  <motion.article
                    whileHover={{ y: -6, borderColor: "rgba(139,92,246,0.5)" }}
                    transition={{ duration: 0.25 }}
                    className="rounded-2xl border border-border/70 bg-card/40 p-5 backdrop-blur-sm h-full"
                  >
                    <Icon className="size-5 text-primary" />
                    <h3 className="water-text mt-8 font-medium">{role.title}</h3>
                    <p className="water-text mt-3 text-sm leading-6 text-muted-foreground">{role.copy}</p>
                  </motion.article>
                </Reveal>
              )
            })}
          </div>
        </div>
      </section>
      <PrivacyExplainer />
      <UserGuide />
      <section id="trust" className="mx-auto max-w-7xl px-6 pb-24 lg:px-10 lg:pb-32">
        <Reveal>
          <motion.div
            whileHover={{ borderColor: "rgba(139,92,246,0.4)" }}
            transition={{ duration: 0.3 }}
            className="flex flex-col justify-between gap-8 rounded-3xl border border-border/70 bg-card/40 p-7 backdrop-blur-md sm:p-10 md:flex-row md:items-end"
          >
            <div>
              <p className="water-text font-mono text-[11px] uppercase tracking-[0.2em] text-primary">Built for the real world</p>
              <h2 className="water-text mt-4 max-w-2xl text-3xl font-medium tracking-[-0.04em] sm:text-4xl">The future of finance should feel calm, clear, and confidential.</h2>
            </div>
            <div className="flex flex-col gap-4">
              <div className="water-text flex max-w-xs items-center gap-3 text-sm leading-6 text-muted-foreground"><LockKeyhole className="size-5 shrink-0 text-accent"/> Powered by confidential tokens on Stellar. Infrastructure designed for responsible financial operations.</div>
              <motion.a href="/wallet" whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} className="inline-flex w-fit items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:brightness-110">Open app <ArrowUpRight className="size-4" /></motion.a>
            </div>
          </motion.div>
        </Reveal>
      </section>
    </main>
    <footer className="relative z-10 mx-auto flex max-w-7xl flex-col gap-3 border-t border-border/60 px-6 py-7 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between lg:px-10"><span className="water-text font-mono tracking-[0.18em]">PRIVYPAY / PRIVATE MONEY INFRASTRUCTURE</span><div className="flex items-center gap-4"><a href="https://forms.gle/jtaNivDd1WBPC1TbA" target="_blank" rel="noopener noreferrer" className="water-text hover:text-foreground transition-colors">Leave feedback</a><span className="water-text">© 2026 PrivyPay. Confidential by design.</span></div></footer>
  </div>
}
