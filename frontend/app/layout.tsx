import type { Metadata } from 'next'
import { Playfair_Display, JetBrains_Mono, DM_Sans } from 'next/font/google'
import './globals.css'
import { Logo } from '@/components/Logo'

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['400', '600', '700'],
})

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  weight: ['300', '400', '500'],
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  weight: ['300', '400', '500', '600'],
})

export const metadata: Metadata = {
  title: 'Platform Libre',
  description: 'From market signal to live campaign in a single conversation',
  icons: {
    icon: '/hand-2.png',
  }
}



export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${playfair.variable} ${jetbrains.variable} ${dmSans.variable}`}>
        {children}
      </body>
    </html>
  )
}
