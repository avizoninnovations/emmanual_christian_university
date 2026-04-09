import { Geist, Geist_Mono } from "next/font/google"
import { Metadata } from "next"

import "@workspace/ui/globals.css"
import { Providers } from "@/components/providers"
import { Toaster } from "@workspace/ui/components/sonner";
import { getToken } from "@/lib/auth-server";

const fontSans = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
})

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export const metadata: Metadata = {
  title: "ECU Staff Portal | Emmanuel Christian University",
  description: "Official staff portal for Emmanuel Christian University university management system.",
  icons: {
    icon: "/icon.png",
    apple: "/icon.png",
  },
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const token = await getToken();
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${fontSans.variable} ${fontMono.variable} font-sans antialiased `}
      >
        <Providers initialToken={token}>
          <Toaster />
          {children}
        </Providers>
      </body>
    </html>
  )
}
