import { AppNav } from "@/components/app-nav"
import { LiquidBackground } from "@/components/liquid-background"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    // No liquid-surface class here — that adds a CSS radial gradient blob.
    // LiquidBackground (canvas) already handles the glow; using both doubles it.
    <div className="relative min-h-screen bg-background text-foreground">
      <LiquidBackground />
      <div className="relative z-10">
        <AppNav />
        {children}
      </div>
    </div>
  )
}
