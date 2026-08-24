import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono, Playfair_Display } from "next/font/google"
import "./globals.css"
import { ActiveDeploymentProvider } from "@/lib/active-deployment"
import { WalletProvider } from "@/lib/wallet-context"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })
const _playfairDisplay = Playfair_Display({ subsets: ["latin"], style: ["italic"], weight: ["400", "700"] })

export const metadata: Metadata = {
  title: "PrivyPay — Money moves better in private.",
  description: "Confidential payroll and invoicing infrastructure for modern teams.",
  icons: { icon: "data:image/svg+xml,<svg viewBox='0 0 32 32' xmlns='http://www.w3.org/2000/svg'><path d='M16 3.5 27.5 10v12L16 28.5 4.5 22V10L16 3.5Z' stroke='white' stroke-width='1.75' fill='none'/><path d='m10 16 4 4 8-9' stroke='white' stroke-linecap='round' stroke-linejoin='round' stroke-width='2'/></svg>" },
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="bg-background" data-scroll-behavior="smooth">
      <body className={`${_geist.className} antialiased`}>
        <ActiveDeploymentProvider>
          <WalletProvider>
            {children}
          </WalletProvider>
        </ActiveDeploymentProvider>
      </body>
    </html>
  )
}
