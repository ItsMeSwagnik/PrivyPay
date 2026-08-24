"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { ConfidentialWallet, type WalletView } from "./wallet";
import { useActiveDeployment } from "./active-deployment";
import { errMsg } from "./err";

interface WalletCtx {
  wallet: ConfidentialWallet | null;
  view: WalletView | null;
  connecting: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  refreshView: () => Promise<void>;
}

const Ctx = createContext<WalletCtx | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const { active } = useActiveDeployment();
  const [wallet, setWallet] = useState<ConfidentialWallet | null>(null);
  const [view, setView] = useState<WalletView | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connect = useCallback(async () => {
    setConnecting(true);
    setError(null);
    try {
      const w = await ConfidentialWallet.connect(active, () => {});
      setWallet(w);
      setView(await w.refresh());
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setConnecting(false);
    }
  }, [active]);

  const disconnect = useCallback(() => {
    wallet?.destroy();
    setWallet(null);
    setView(null);
    setError(null);
  }, [wallet]);

  const refreshView = useCallback(async () => {
    if (!wallet) return;
    setView(await wallet.refresh());
  }, [wallet]);

  return (
    <Ctx.Provider value={{ wallet, view, connecting, error, connect, disconnect, refreshView }}>
      {children}
    </Ctx.Provider>
  );
}

export function useWallet(): WalletCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useWallet must be used within WalletProvider");
  return ctx;
}
