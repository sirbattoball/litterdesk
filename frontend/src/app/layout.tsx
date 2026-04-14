import type { Metadata } from 'next'
import './globals.css'
import { Providers } from '@/components/Providers'
import { Toaster } from 'react-hot-toast'

export const metadata: Metadata = {
  title: 'LitterDesk — The Operating System for Serious Dog Breeders',
  description: 'Replace your spreadsheets, Word contracts, and text threads. LitterDesk manages your litters, buyers, contracts, and payments in one place — with AI that does the work for you.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Instrument+Sans:wght@400;500;600&display=swap" rel="stylesheet" />
      </head>
      <body>
        <Providers>
          {children}
          <Toaster position="top-right" toastOptions={{
            style: {
              background: '#0d1a0f',
              color: '#faf8f3',
              fontFamily: 'Instrument Sans, sans-serif',
              fontSize: '14px',
              borderRadius: '10px',
            }
          }} />
        </Providers>
      </body>
    </html>
  )
}
