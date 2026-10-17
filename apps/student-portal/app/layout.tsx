import { Roboto, Geist_Mono } from "next/font/google"
import { Metadata } from "next"

import "@workspace/ui/globals.css"
import "./student-portal.css"
import { Providers } from "@/components/providers"
import { Toaster } from "@workspace/ui/components/sonner";

const fontSans = Roboto({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  variable: "--font-sans",
})

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export const metadata: Metadata = {
  title: "ECU Student Portal | Emmanuel Christian University",
  description: "Official student portal for Emmanuel Christian University.",
  icons: {
    icon: { url: "/icon.png", type: "image/png" },
    apple: { url: "/icon.png", type: "image/png" },
  },
  openGraph: {
    title: "ECU Student Portal | Emmanuel Christian University",
    description: "Official student portal for Emmanuel Christian University.",
    images: [{ url: "/icon.png", width: 1536, height: 1024, alt: "Emmanuel Christian University crest" }],
  },
  twitter: {
    card: "summary_large_image",
    images: [{ url: "/icon.png", alt: "Emmanuel Christian University crest" }],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${fontSans.variable} ${fontMono.variable} font-sans antialiased `}
      >
        <Providers>
          <Toaster />
          {children}
        </Providers>
      </body>
    </html>
  )
}
