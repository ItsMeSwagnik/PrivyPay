"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Menu, MessageSquare, Wallet, X } from "lucide-react";
import { useWallet } from "@/lib/wallet-context";
import { truncateAddr } from "@/lib/format";

const NAV_LINKS = [
  { href: "/wallet", label: "Wallet" },
  { href: "/payroll", label: "Payroll" },
  { href: "/invoices", label: "Invoices" },
  { href: "/auditor", label: "Auditor" },
  { href: "/verify", label: "Verify" },
];

const FEEDBACK_URL = "https://forms.gle/jtaNivDd1WBPC1TbA";

export function AppNav() {
  const pathname = usePathname();
  const { view, connecting, connect, disconnect } = useWallet();
  const [showDisconnect, setShowDisconnect] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const connected = !!view;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDisconnect(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // close mobile menu on route change
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 lg:px-10">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 mr-2 shrink-0">
          <img src="/PrivyPay logo.png" alt="PrivyPay" className="h-11 w-auto object-contain" />
          <span className="font-mono text-sm font-semibold tracking-[0.28em] hidden sm:block">PRIVYPAY</span>
        </Link>

        {/* Desktop nav links */}
        <nav className="hidden md:flex items-center gap-0.5">
          {NAV_LINKS.map((l) => {
            const active = pathname.startsWith(l.href);
            return (
              <Link key={l.href} href={l.href}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-white/5"}`}>
                {l.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {/* Testnet badge */}
          <span className="hidden sm:flex items-center gap-1.5 rounded-full border border-border/60 bg-card/40 px-3 py-1 text-[10px] font-mono text-accent">
            <span className="size-1.5 rounded-full bg-accent animate-pulse" />
            Testnet
          </span>

          {/* Feedback */}
          <a href={FEEDBACK_URL} target="_blank" rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-1.5 rounded-full border border-border/60 bg-card/40 px-3 py-1 text-[10px] font-mono text-muted-foreground hover:text-foreground transition-colors">
            <MessageSquare className="size-3" />
            Feedback
          </a>

          {/* Wallet connect / status */}
          {connected ? (
            <div className="relative" ref={dropdownRef}>
              <button onClick={() => setShowDisconnect((v) => !v)}
                className="flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5">
                <span className="size-1.5 rounded-full bg-emerald-400" />
                <span className="font-mono text-xs text-emerald-400">{truncateAddr(view.address, 4, 4)}</span>
              </button>
              {showDisconnect && (
                <div className="absolute right-0 top-full mt-1 z-50">
                  <button onClick={() => { disconnect(); setShowDisconnect(false); }}
                    className="flex items-center gap-2 rounded-lg border border-border/60 bg-card px-4 py-2 text-xs text-muted-foreground hover:text-destructive hover:border-destructive/40 transition-colors whitespace-nowrap shadow-lg">
                    Disconnect
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button onClick={connect} disabled={connecting}
              className="flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20 disabled:opacity-50">
              <Wallet className="size-3.5" />
              <span className="hidden sm:inline">{connecting ? "Connecting…" : "Connect wallet"}</span>
              <span className="sm:hidden">{connecting ? "…" : "Connect"}</span>
            </button>
          )}

          {/* Mobile hamburger */}
          <button onClick={() => setMobileOpen((v) => !v)}
            className="md:hidden rounded-lg border border-border/60 p-2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Toggle menu">
            {mobileOpen ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border/60 bg-background/95 backdrop-blur-xl px-4 py-3 space-y-1">
          {NAV_LINKS.map((l) => {
            const active = pathname.startsWith(l.href);
            return (
              <Link key={l.href} href={l.href}
                className={`block rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-white/5"}`}>
                {l.label}
              </Link>
            );
          })}
          <a href={FEEDBACK_URL} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors">
            <MessageSquare className="size-4" />
            Leave feedback
          </a>
        </div>
      )}
    </header>
  );
}
