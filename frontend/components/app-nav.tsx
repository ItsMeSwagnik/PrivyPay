"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LockKeyhole, Wallet } from "lucide-react";
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
  const { view, connecting, connect } = useWallet();
  const connected = !!view;

  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-6 py-3 lg:px-10">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 mr-2 shrink-0">
          <span className="grid size-7 place-items-center rounded-lg border border-primary/40 bg-primary/15 text-primary">
            <LockKeyhole className="size-3.5" />
          </span>
          <span className="font-mono text-xs font-semibold tracking-[0.22em] hidden sm:block">PRIVYPAY</span>
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
            <div className="flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5">
              <span className="size-1.5 rounded-full bg-emerald-400" />
              <span className="font-mono text-xs text-emerald-400">
                {truncateAddr(view.address, 4, 4)}
              </span>
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
