import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'YESOPD — Book Doctor Appointments',
  description: 'Find doctors and book OPD appointments online',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'YESOPD',
  },
  formatDetection: { telephone: false },
  openGraph: {
    type: 'website',
    title: 'YESOPD',
    description: 'Book OPD appointments online',
  },
}

export const viewport: Viewport = {
  themeColor: '#006EFF',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  )
}