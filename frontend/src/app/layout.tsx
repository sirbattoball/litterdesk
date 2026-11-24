import type { Metadata } from 'next'
import './globals.css'
import { Providers } from '@/components/Providers'
import { HomeLink } from '@/components/HomeLink'
import { Toaster } from 'react-hot-toast'

export const metadata: Metadata = {
  metadataBase: new URL('https://litterdesk.com'),
  title: 'LitterDesk — Puppy waitlist & contract software for dog breeders',
  description: 'Keep your buyer waitlist, deposits and puppy contracts in one place. Software for small dog breeders raising 1–4 litters a year. Free 7-day trial, no card required.',
  icons: { icon: '/favicon.svg' },
  openGraph: {
    type: 'website',
    siteName: 'LitterDesk',
    title: 'LitterDesk: a little less admin, a lot more puppy time',
    description: 'Buyer waitlists, deposits and puppy contracts in one place, for small dog breeders.',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'LitterDesk' }],
  },
  twitter: { card: 'summary_large_image', images: ['/og.png'] },
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
          <HomeLink />
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
