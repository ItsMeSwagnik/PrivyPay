import type { ReactNode } from "react";

export function PageShell({ title, subtitle, children, badge }: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  badge?: string;
}) {
  return (
    <div className="mx-auto max-w-5xl px-6 py-10 lg:px-10">
      <header className="mb-8">
        {badge && (
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.2em] text-primary">
            <span className="size-1.5 rounded-full bg-accent" />
            {badge}
          </div>
        )}
        <h1 className="text-3xl font-medium tracking-tight">{title}</h1>
        {subtitle && (
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">{subtitle}</p>
        )}
      </header>
      {children}
    </div>
  );
}
