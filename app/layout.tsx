import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"
import { ThemeProvider } from "@/components/layout/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import { Suspense } from "react"
import Loading from "./loading"

export const metadata: Metadata = {
  title: "Twitter",
  generator: "Twitter",
}

const geistSans = GeistSans.variable
const geistMono = GeistMono.variable

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${geistSans} ${geistMono} antialiased`} suppressHydrationWarning>
      <body>
        <Suspense fallback={<Loading />}>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
            {children}
            <Toaster />
          </ThemeProvider>
          <Analytics />
        </Suspense>
      </body>
    </html>
  )
}


