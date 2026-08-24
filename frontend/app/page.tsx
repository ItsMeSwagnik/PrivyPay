import WaitlistHero from "@/components/waitlist-hero"

export default function Home() {
  return (
    <main className="min-h-screen relative overflow-hidden">
      <WaitlistHero />
    </main>
  )
}

export const dynamic = "force-dynamic"
