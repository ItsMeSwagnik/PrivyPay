"use client";

export function LogPanel({ logs }: { logs: string[] }) {
  if (logs.length === 0) return null;
  return (
    <div className="mt-6 rounded-2xl border border-border/40 bg-white/[0.02] p-4 backdrop-blur-sm">
      <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground/60">Activity log</p>
      <ul className="space-y-0.5 font-mono text-xs text-muted-foreground">
        {logs.map((l, i) => <li key={i}>{l}</li>)}
      </ul>
    </div>
  );
}
