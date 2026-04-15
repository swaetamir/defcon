import type { Metadata } from 'next'
import { VT323 } from 'next/font/google'
import './globals.css'

const vt323 = VT323({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-vt323',
})

export const metadata: Metadata = {
  title: 'DEFCON',
  description: 'KINETIC ENERGY ANALYSIS SYSTEM',
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${vt323.variable} antialiased flex flex-col min-h-screen`}>
        <div className="flex-1 flex flex-col">{children}</div>
        <footer
          style={{ fontFamily: 'var(--font-vt323), monospace' }}
          className="flex items-center justify-end px-5 py-2 border-t border-[var(--green-dark)] text-lg tracking-widest shrink-0"
        >
          <span style={{ color: 'var(--green)', opacity: 0.5 }}>SWAETA MIR, 2026</span>
        </footer>
      </body>
    </html>
  )
}
