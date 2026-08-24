import type { ReactNode } from "react";

export function ErrorBox({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive backdrop-blur-sm ${className}`}>
      {children}
    </div>
  );
}
