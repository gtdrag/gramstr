import { CheckoutRedirect } from "@/components/payments/checkout-redirect"
import { TooltipProvider } from "@/components/ui/tooltip"
import { TailwindIndicator } from "@/components/utility/tailwind-indicator"
import { ClerkProvider } from "@clerk/nextjs"
import { NostrProvider } from "@/context/nostr-context"
import type { Metadata } from "next"
import { ThemeProvider } from "next-themes"
import { Geist, Geist_Mono } from "next/font/google"
import { Toaster } from "sonner"
import "./globals.css"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"]
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"]
})

export const metadata: Metadata = {
  title: "⚡gramstr - Instagram to NOSTR",
  description: "Download Instagram content and cross-post to NOSTR."
}

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning className="dark">
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-950 text-white min-h-screen`}
        >
          <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
            <NostrProvider>
              <TooltipProvider>
                {children}
                <CheckoutRedirect />

                <TailwindIndicator />
                <Toaster />
              </TooltipProvider>
            </NostrProvider>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  )
}
