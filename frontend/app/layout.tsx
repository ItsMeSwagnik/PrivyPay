import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono, Playfair_Display } from "next/font/google"
import { Analytics } from "@vercel/analytics/react"
import "./globals.css"
import { ActiveDeploymentProvider } from "@/lib/active-deployment"
import { WalletProvider } from "@/lib/wallet-context"
import { Toaster } from "@/components/ui/sonner"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })
const _playfairDisplay = Playfair_Display({ subsets: ["latin"], style: ["italic"], weight: ["400", "700"] })

export const metadata: Metadata = {
  title: "PrivyPay — Money moves better in private.",
  description: "Confidential payroll and invoicing infrastructure for modern teams.",
  icons: { icon: "/PrivyPay logo.png" },
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="bg-background" data-scroll-behavior="smooth">
      <body className={`${_geist.className} antialiased`}>
        <ActiveDeploymentProvider>
          <WalletProvider>
            {children}
            <Analytics />
            <Toaster position="bottom-right" expand={true} duration={3000} />
          </WalletProvider>
        </ActiveDeploymentProvider>
      </body>
    </html>
  )
}
