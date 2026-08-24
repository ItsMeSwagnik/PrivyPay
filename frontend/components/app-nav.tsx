"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Wallet } from "lucide-react";
import { useWallet } from "@/lib/wallet-context";
import { truncateAddr } from "@/lib/format";

const NAV_LINKS = [
  { href: "/wallet", label: "Wallet" },
  { href: "/payroll", label: "Payroll" },
  { href: "/invoices", label: "Invoices" },
  { href: "/auditor", label: "Auditor" },
  { href: "/verify", label: "Verify" },
];

export function AppNav() {
  const pathname = usePathname();
  const { view, connecting, connect, disconnect } = useWallet();
  const connected = !!view;

  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-6 py-3 lg:px-10">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 mr-2 shrink-0">
          <span className="grid size-9 place-items-center rounded-xl border border-primary/40 bg-primary/15 text-primary shadow-lg shadow-primary/10">
            <svg viewBox="0 0 32 32" className="size-5" fill="none" aria-hidden="true"><path d="M16 3.5 27.5 10v12L16 28.5 4.5 22V10L16 3.5Z" stroke="currentColor" strokeWidth="1.75"/><path d="m10 16 4 4 8-9" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"/></svg>
          </span>
          <span className="font-mono text-sm font-semibold tracking-[0.28em] hidden sm:block">PRIVYPAY</span>
        </Link>

        {/* Nav links */}
        <nav className="flex items-center gap-0.5">
          {NAV_LINKS.map((l) => {
            const active = pathname.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          {/* Testnet badge */}
          <span className="hidden sm:flex items-center gap-1.5 rounded-full border border-border/60 bg-card/40 px-3 py-1 text-[10px] font-mono text-accent">
            <span className="size-1.5 rounded-full bg-accent animate-pulse" />
            Testnet
          </span>

          {/* Wallet connect / status */}
          {connected ? (
            <div className="relative group">
              <button className="flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5">
                <span className="size-1.5 rounded-full bg-emerald-400" />
                <span className="font-mono text-xs text-emerald-400">
                  {truncateAddr(view.address, 4, 4)}
                </span>
              </button>
              <div className="absolute right-0 top-full mt-1 hidden group-hover:block z-50">
                <button
                  onClick={disconnect}
                  className="flex items-center gap-2 rounded-lg border border-border/60 bg-card px-4 py-2 text-xs text-muted-foreground hover:text-destructive hover:border-destructive/40 transition-colors whitespace-nowrap shadow-lg"
                >
                  Disconnect
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={connect}
              disabled={connecting}
              className="flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20 disabled:opacity-50"
            >
              <Wallet className="size-3.5" />
              {connecting ? "Connecting…" : "Connect wallet"}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
